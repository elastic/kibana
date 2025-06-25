/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { type Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import { buildNode as buildWildcardNode } from '@kbn/es-query/src/kuery/node_types/wildcard';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
import { CASE_SAVED_OBJECT, CASE_ID_INCREMENTER_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import type {
  CaseIdIncrementerPersistedAttributes,
  CaseIdIncrementerSavedObject,
} from '../../common/types/id_incrementer';

type GetCasesParameters = Pick<
  SavedObjectsFindOptions,
  'sortField' | 'sortOrder' | 'perPage' | 'page' | 'filter' | 'namespaces'
>;

export class CasesIncrementalIdService {
  static incrementalIdExistsFilter = nodeBuilder.is(
    `${CASE_SAVED_OBJECT}.attributes.incremental_id`,
    buildWildcardNode('*')
  );
  static incrementalIdMissingFilter = fromKueryExpression(
    `not ${CASE_SAVED_OBJECT}.attributes.incremental_id: *`
  );
  private isStopped = false;

  constructor(
    private internalSavedObjectsClient: SavedObjectsClientContract,
    private logger: Logger
  ) {
    this.logger = logger.get('incremental_id_service');
    this.logger.debug('Cases incremental ID service initialized');
  }

  public stopService() {
    this.isStopped = true;
  }
  public startService() {
    this.isStopped = false;
  }

  public async getCasesWithoutIncrementalId(parameters: Omit<GetCasesParameters, 'filter'> = {}) {
    return this.getCases({
      ...parameters,
      filter: CasesIncrementalIdService.incrementalIdMissingFilter,
    });
  }

  public async getCases({
    filter,
    perPage = 1000,
    page = 1,
    sortOrder = 'asc',
    sortField = 'created_at',
    namespaces = ['*'],
  }: GetCasesParameters) {
    try {
      const savedCases = await this.internalSavedObjectsClient.find<CasePersistedAttributes>({
        type: CASE_SAVED_OBJECT,
        sortField,
        sortOrder,
        perPage,
        page,
        filter,
        namespaces,
      });
      return savedCases;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Get the latest applied ID for a given space.
   * Uses the actually applied numerical ids on cases in the space.
   */
  public async getLastAppliedIdForSpace(namespace: string) {
    try {
      const casesResponse = await this.getCases({
        filter: CasesIncrementalIdService.incrementalIdExistsFilter,
        namespaces: [namespace],
        sortField: 'incremental_id',
        sortOrder: 'desc',
        perPage: 1, // We only need the most recent incremental id value
        page: 1,
      });

      if (casesResponse.total === 0) {
        this.logger.debug(`No cases found with incremental id in ${namespace}`);
        return 0;
      }

      const mostRecentIncrementalId = casesResponse.saved_objects[0].attributes.incremental_id;
      this.logger.debug(
        `getLastAppliedIdForSpace (from cases): Most recent incremental id in ${namespace}: ${mostRecentIncrementalId}`
      );

      if (mostRecentIncrementalId === undefined || mostRecentIncrementalId === null) {
        return 0;
      }

      return mostRecentIncrementalId;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Increments the case ids for the given cases.
   * @param casesWithoutIncrementalId The cases we want to apply IDs to
   * @returns The amount of processed cases.
   */
  public async incrementCaseIds(
    casesWithoutIncrementalId: Array<SavedObjectsFindResult<CasePersistedAttributes>>
  ): Promise<number> {
    let countProcessedCases = 0;
    /** In-memory cache of the incremental ID SO changes that we will need to apply */
    const incIdSoCache: Map<string, SavedObject<CaseIdIncrementerPersistedAttributes>> = new Map();

    let hasAppliedAnId = false;

    for (let index = 0; index < casesWithoutIncrementalId.length && !this.isStopped; index++) {
      try {
        const caseSo = casesWithoutIncrementalId[index];
        const namespaceOfCase = caseSo.namespaces?.[0];
        if (!namespaceOfCase) {
          this.logger.error(`Case ${caseSo.id} has no namespace assigned. Skipping it.`);
          // eslint-disable-next-line no-continue
          continue;
        }

        // Get the incremental id SO from the cache or fetch it
        let incIdSo = incIdSoCache.get(namespaceOfCase);
        if (!incIdSo) {
          this.logger.debug(
            `Don't have incrementer in cache, fetching it: namespace ${namespaceOfCase}`
          );
          incIdSo = await this.getOrCreateCaseIdIncrementerSo(namespaceOfCase);
          this.logger.debug(
            `Fetched incrementer SO for ${namespaceOfCase}: ${JSON.stringify(incIdSo)}`
          );
          incIdSoCache.set(namespaceOfCase, incIdSo);
        }

        // Increase the inc id
        const newId = incIdSo.attributes.last_id + 1;
        // Apply the new ID to the case
        await this.applyIncrementalIdToCaseSo(caseSo, newId, namespaceOfCase);

        if (this.isStopped) {
          // The service was stopped while the last write was happening,
          // we need to reset the previous incremental id, in order to avoid
          // double-assigned id.
          this.logger.warn('Need to reset incremental case id because service was stopped');
          await this.applyIncrementalIdToCaseSo(caseSo, null, namespaceOfCase);
        } else {
          // Apply the new ID to the local incrementer SO, it will persist later
          incIdSo.attributes.last_id = newId;
          hasAppliedAnId = true;
          countProcessedCases++;
        }
      } catch (error) {
        this.logger.error(`ID incrementing paused due to error: ${error}`);
        break;
      }
    }

    // If changes have been made, apply the changes to the counters
    // These are done in sequence, since we cannot guarantee that `incIdSoCache` is small.
    // It might have hundreds/thousands of SO objects cached that need updating.
    if (hasAppliedAnId && !this.isStopped) {
      for (const [namespace, incIdSo] of incIdSoCache) {
        await this.incrementCounterSO(incIdSo, incIdSo.attributes.last_id, namespace);
      }
    }

    return countProcessedCases;
  }

  getCaseIdIncrementerSo(namespace: string) {
    return this.internalSavedObjectsClient.find<CaseIdIncrementerPersistedAttributes>({
      type: CASE_ID_INCREMENTER_SAVED_OBJECT,
      namespaces: [namespace],
    });
  }

  /**
   * Gets or creates the case id incrementer SO for the given namespace
   * @param namespace The namespace of the case id incrementor so
   */
  async getOrCreateCaseIdIncrementerSo(
    namespace: string
  ): Promise<SavedObject<CaseIdIncrementerPersistedAttributes>> {
    try {
      const [latestAppliedId, incrementerResponse] = await Promise.all([
        // Get the latest applied id by looking at the case saved objects
        await this.getLastAppliedIdForSpace(namespace),
        // Get the case id incrementer saved object
        await this.getCaseIdIncrementerSo(namespace),
      ]);
      this.logger.debug(`Latest applied ID to a case for ${namespace}: ${latestAppliedId}`);

      const actualLatestId = latestAppliedId || 0;

      const incrementerSO = incrementerResponse?.saved_objects[0];

      // We should not have multiple incrementer SO's per namespace, but if we do, let's resolve that
      if (incrementerResponse.total > 1) {
        this.logger.error(
          `Only 1 incrementer should exist, but multiple incrementers found in ${namespace}. Resolving to max incrementer.`
        );
        return this.resolveMultipleIncrementerSO(
          incrementerResponse.saved_objects,
          actualLatestId,
          namespace
        );
      }

      // Only one incrementer SO exists
      if (incrementerResponse.total === 1) {
        // If we have matching incremental ids, we're good
        const idsMatch = actualLatestId === incrementerSO.attributes.last_id;
        if (idsMatch || incrementerSO.attributes.last_id >= actualLatestId) {
          this.logger.debug(
            `Incrementer found for ${namespace} with matching or bigger id. No changes needed.`
          );
          return incrementerSO;
        } else {
          // Otherwise, we're updating the incrementer SO to the highest value
          this.logger.debug(
            `Incrementer found for ${namespace} with id ${incrementerSO.attributes.last_id}. Updating to ${actualLatestId}.`
          );
          return this.incrementCounterSO(incrementerSO, actualLatestId, namespace);
        }
      } else {
        // At this point we assume that no incrementer SO exists
        this.logger.debug(`No incrementer found for ${namespace}. Creating a new one.`);
        return this.createCaseIdIncrementerSo(namespace);
      }
    } catch (error) {
      throw new Error(`Unable to use an existing incrementer: ${error}`);
    }
  }

  /**
   * Resolves the situation when multiple incrementer SOs exists
   */
  public async resolveMultipleIncrementerSO(
    incrementerQueryResponse: Array<SavedObjectsFindResult<CaseIdIncrementerPersistedAttributes>>,
    latestAppliedId: number,
    namespace: string
  ) {
    // Find the incrementer with the highest ID and the incrementers to delete
    const { incrementerWithHighestId, incrementersToDelete } = incrementerQueryResponse.reduce(
      (result, currIncrementer) => {
        if (result.incrementerWithHighestId === currIncrementer) {
          // don't do anything if we're comparing the same objects
          return result;
        } else {
          // the current incrementer has a higher value, it becomes the new highest one
          // the previous highest one is scheduled for deletion
          if (
            currIncrementer.attributes.last_id > result.incrementerWithHighestId.attributes.last_id
          ) {
            result.incrementersToDelete.push(result.incrementerWithHighestId);
            result.incrementerWithHighestId = currIncrementer;
          } else {
            // the current incrementer is not higher than the highest one, we're deleting it
            result.incrementersToDelete.push(currIncrementer);
          }
          return result;
        }
      },
      {
        incrementerWithHighestId: incrementerQueryResponse[0],
        incrementersToDelete: [] as Array<
          SavedObjectsFindResult<CaseIdIncrementerPersistedAttributes>
        >,
      }
    );

    try {
      await this.internalSavedObjectsClient.bulkDelete(incrementersToDelete);
    } catch (e) {
      this.logger.debug('Could not delete all duplicate incrementers.');
      this.logger.error(e);
    }

    // If a max incrementer exists, update it with the max value found
    if (incrementerWithHighestId) {
      if (incrementerWithHighestId.attributes.last_id >= latestAppliedId) {
        return incrementerWithHighestId;
      } else {
        return this.incrementCounterSO(incrementerWithHighestId, latestAppliedId, namespace);
      }
    } else {
      this.logger.debug(
        `ResolveMultipleIncrementers: No incrementer found for ${namespace}. Creating a new one.`
      );
      // If there is no max incrementer, create a new one
      return this.createCaseIdIncrementerSo(namespace, latestAppliedId);
    }
  }

  /**
   * Creates a case id incrementer SO for the given namespace
   * @param namespace The namespace for the newly created case id incrementer SO
   */
  public async createCaseIdIncrementerSo(namespace: string, lastId = 0) {
    try {
      const currentTime = new Date().getTime();
      const intializedIncrementalIdSo =
        await this.internalSavedObjectsClient.create<CaseIdIncrementerPersistedAttributes>(
          CASE_ID_INCREMENTER_SAVED_OBJECT,
          {
            last_id: lastId,
            '@timestamp': currentTime,
            updated_at: currentTime,
          },
          {
            namespace,
          }
        );
      return intializedIncrementalIdSo;
    } catch (error) {
      this.logger.error(`Unable to create incrementer due to error: ${error}`);
      throw error;
    }
  }

  public async incrementCounterSO(
    incrementerSo: CaseIdIncrementerSavedObject,
    lastAppliedId: number,
    namespace: string
  ): Promise<SavedObject<CaseIdIncrementerPersistedAttributes>> {
    try {
      const updatedAttributes = {
        last_id: lastAppliedId,
        updated_at: new Date().getTime(),
      };
      await this.internalSavedObjectsClient.update<CaseIdIncrementerPersistedAttributes>(
        CASE_ID_INCREMENTER_SAVED_OBJECT,
        incrementerSo.id,
        updatedAttributes,
        {
          namespace,
        }
      );

      // Manually updating the SO here because `SavedObjectsClient.update`
      // returns a type with a `Partial` of the SO's attributes.
      return {
        ...incrementerSo,
        attributes: {
          ...incrementerSo.attributes,
          ...updatedAttributes,
        },
      };
    } catch (error) {
      this.logger.error(`Unable to update incrementer due to error: ${error}`);
      throw error;
    }
  }

  public async applyIncrementalIdToCaseSo(
    currentCaseSo: SavedObjectsFindResult<CasePersistedAttributes>,
    newIncrementalId: number | null,
    namespace: string
  ) {
    // We shouldn't have to worry about version conflicts, as we're not modifying any existing fields
    // just applying a new field
    const updateCase = async () => {
      await this.internalSavedObjectsClient.update<CasePersistedAttributes>(
        CASE_SAVED_OBJECT,
        currentCaseSo.id,
        { incremental_id: newIncrementalId },
        { namespace }
      );
    };

    try {
      await pRetry(updateCase, {
        maxTimeout: 3000,
        retries: 3,
        factor: 2,
        onFailedAttempt: (error) => {
          this.logger.warn(
            `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`
          );
        },
      });
    } catch (err) {
      this.logger.error(`Failed to apply incremental id ${newIncrementalId}`);
      throw err;
    }
  }
}
