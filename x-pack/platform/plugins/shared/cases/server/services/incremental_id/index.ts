/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
  SavedObjectsClient,
} from '@kbn/core/server';
import { type Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import { CASE_SAVED_OBJECT, CASE_ID_INCREMENTER_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import type {
  CaseIdIncrementerPersistedAttributes,
  CaseIdIncrementerSavedObject,
} from '../../common/types/id_incrementer';

export class CasesIncrementalIdService {
  static incrementalIdExistsFilter = 'cases.attributes.incremental_id: *';
  static incrementalIdMissingFilter = 'not cases.attributes.incremental_id: *';

  constructor(private savedObjectsClient: SavedObjectsClient, private logger: Logger) {
    this.logger = logger.get('incremental-id-service');
    this.logger.info('Cases incremental ID service initialized');
  }

  public getCases = async ({
    filter,
    namespaces,
    perPage = 10000,
    page = 1,
    sortOrder = 'asc',
    sortField = 'created_at',
  }: Pick<
    SavedObjectsFindOptions,
    'sortField' | 'sortOrder' | 'perPage' | 'page' | 'filter' | 'namespaces'
  >) => {
    try {
      const savedCases = await this.savedObjectsClient.find<CasePersistedAttributes>({
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
  };

  // TODO: Could be used to initialize the count from the accurate value in the scenario we lost our state for whatever reason
  public getLastAppliedIdPerSpace = async (namespaces: string[]) => {
    const idTracker: Record<string, number> = {};
    for (let i = 0; i < namespaces.length; i++) {
      const namespace = namespaces[i];
      try {
        const casesResponse = await this.getCases({
          filter: CasesIncrementalIdService.incrementalIdExistsFilter,
          namespaces: [namespace],
          sortField: 'attributes.incremental_id',
          sortOrder: 'desc',
          perPage: 1, // We only need the most recent incremental id value
          page: 1,
        });
        if (casesResponse.total === 0) return { [namespace]: undefined };
        const mostRecentIncrementalId = casesResponse.saved_objects[0].attributes.incremental_id;
        if (mostRecentIncrementalId !== casesResponse.total) {
          throw new Error('Mismatch between incremental id and case count');
        }
        idTracker[namespace] = mostRecentIncrementalId;
      } catch (error) {
        this.logger.error(error);
      }
    }
    return idTracker;
  };

  // TODO: Remove, just wanted to test performance and see behavior. It is not practical to implement this
  // as significant failures will lead to gaps in the incrementing id...i.e. case #46 out of 100 not applied, because of an unrecoverable error
  // When retried in the future case #46, would end up becoming case #101 or some future number, and #46 is never assigned.
  public incrementCaseIdInParallel = async (
    casesWithoutIncrementalId: Array<SavedObjectsFindResult<CasePersistedAttributes>>,
    namespace: string,
    latestIdToReinitializeWith?: number,
  ) => {
    const incrementerSo = await this.getCaseIdIncrementerSo(namespace, latestIdToReinitializeWith);
    const nextIncrementalId = incrementerSo.attributes.next_id;

    let lastAppliedId = 0;
    const updateCase = async (
      caseSo: SavedObjectsFindResult<CasePersistedAttributes>,
      index: number
    ) => {
      const newId = nextIncrementalId + index;
      await this.applyIncrementalIdToCaseSo(caseSo, newId, namespace);
      lastAppliedId = Math.max(lastAppliedId, newId);
    };

    const updateResults = await Promise.allSettled(casesWithoutIncrementalId.map(updateCase));

    // In the event there were any failues for whatever reason to update, we should retry again
    for (let i = 0; i < updateResults.length; i += 1) {
      const currentResult = updateResults[i];
      if (currentResult.status === 'rejected') {
        const caseSo = casesWithoutIncrementalId[i];
        await updateCase(caseSo, i);
      }
    }

    if (lastAppliedId) {
      // Only increment the counter if an id was applied
      await this.incrementCounter(incrementerSo, lastAppliedId, namespace);
    }

    return lastAppliedId;
  };

  public incrementCaseIdSequentially = async (
    casesWithoutIncrementalId: Array<SavedObjectsFindResult<CasePersistedAttributes>>,
    namespace: string,
    latestIdToReinitializeWith?: number
  ) => {
    const incrementerSo = await this.getCaseIdIncrementerSo(namespace, latestIdToReinitializeWith);
    const nextIncrementalId = incrementerSo.attributes.next_id;

    let lastAppliedId;
    for (let index = 0; index < casesWithoutIncrementalId.length; index++) {
      try {
        const caseSo = casesWithoutIncrementalId[index];
        const newId = nextIncrementalId + index;
        await this.applyIncrementalIdToCaseSo(caseSo, newId, namespace);
        lastAppliedId = newId;
      } catch (error) {
        this.logger.error(`ID incrementing paused due to error: ${error}`);
        break;
      }
    }

    if (lastAppliedId) {
      // Only increment the counter if an id was applied
      await this.incrementCounter(incrementerSo, lastAppliedId, namespace);
    }

    return lastAppliedId;
  };

  private getCaseIdIncrementerSo = async (namespace: string, nextIncrementalIdToApply?: number) => {
    try {
      const incrementerResponse =
        await this.savedObjectsClient.find<CaseIdIncrementerPersistedAttributes>({
          type: CASE_ID_INCREMENTER_SAVED_OBJECT,
          namespaces: [namespace],
        });
      if (incrementerResponse.total === 1) return incrementerResponse?.saved_objects[0];

      if (incrementerResponse.total > 1) {
        // We should not have multiple incrementer SO's per namespace
        // if this does happen, we need to add resolution logic
        const err = `Only 1 incrementer should exist, but multiple incrementers found in ${namespace}`;
        throw new Error(err);
      }
    } catch (error) {
      this.logger.error(`Unable to use an existing incrementer: ${error}`);
      // TODO: Potentially return here rather than potentially creating a duplicate incrementer below
    }

    try {
      const currentTime = new Date().getTime();
      const intializedIncrementalIdSo =
        await this.savedObjectsClient.create<CaseIdIncrementerPersistedAttributes>(
          CASE_ID_INCREMENTER_SAVED_OBJECT,
          {
            next_id: nextIncrementalIdToApply ?? 1,
            '@timestamp': currentTime,
            updated_at: currentTime,
          },
          {
            namespace,
          }
        );
      return intializedIncrementalIdSo;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  };

  private incrementCounter = async (
    incrementerSo: CaseIdIncrementerSavedObject,
    lastAppliedId: number,
    namespace: string
  ) => {
    try {
      await this.savedObjectsClient.update<CaseIdIncrementerPersistedAttributes>(
        CASE_ID_INCREMENTER_SAVED_OBJECT,
        incrementerSo.id,
        {
          next_id: lastAppliedId + 1,
          updated_at: new Date().getTime(),
        },
        {
          version: incrementerSo.version,
          namespace,
        }
      );
    } catch (error) {
      this.logger.error(`Unable to updste incrementer due to error: ${error}`);
      throw error;
    }
  };

  private applyIncrementalIdToCaseSo = async (
    currentCaseSo: SavedObjectsFindResult<CasePersistedAttributes>,
    newIncrementalId: number,
    namespace: string
  ) => {
    if (currentCaseSo.attributes.incremental_id != null) {
      return;
    }

    // We shouldn't have to worry about version conflicts, as we're not modifying any existing fields
    // just applying a new field
    const updateCase = async () => {
      await this.savedObjectsClient.update<CasePersistedAttributes>(
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
  };
}
