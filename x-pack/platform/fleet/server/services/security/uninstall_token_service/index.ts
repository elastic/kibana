/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes, createHash } from 'crypto';

import { chunk } from 'lodash';

import type {
  SavedObjectsClientContract,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsBulkUpdateObject,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import type {
  AggregationsMultiBucketAggregateBase,
  AggregationsTopHitsAggregate,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { asyncForEach, asyncMap } from '@kbn/std';

import type {
  AggregationsTermsInclude,
  AggregationsTermsExclude,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { isResponseError } from '@kbn/es-errors';

import type { AgentPolicySOAttributes } from '../../../types';

import { UninstallTokenError } from '../../../../common/errors';

import type { GetUninstallTokensMetadataResponse } from '../../../../common/types/rest_spec/uninstall_token';

import type {
  UninstallToken,
  UninstallTokenMetadata,
} from '../../../../common/types/models/uninstall_token';

import {
  UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
} from '../../../constants';
import { appContextService } from '../../app_context';
import { agentPolicyService } from '../../agent_policy';

interface UninstallTokenSOAttributes {
  policy_id: string;
  token: string;
  token_plain: string;
}

interface UninstallTokenSOAggregationBucket {
  key: string;
  latest: AggregationsTopHitsAggregate;
}

interface UninstallTokenSOAggregation {
  by_policy_id: AggregationsMultiBucketAggregateBase<UninstallTokenSOAggregationBucket>;
}

export interface UninstallTokenInvalidError {
  error: UninstallTokenError;
}

export interface UninstallTokenServiceInterface {
  /**
   * Get uninstall token based on its id.
   *
   * @param id
   * @returns uninstall token if found, null if not found
   */
  getToken(id: string): Promise<UninstallToken | null>;

  /**
   * Get uninstall token metadata, optionally filtering for policyID and policy name, with a logical OR relation:
   * every uninstall token is returned with a related agent policy which partially matches either the given policyID or the policy name.
   * The result is paginated.
   *
   * @param policyIdSearchTerm a string for partial matching the policyId
   * @param policyNameSearchTerm a string for partial matching the policy name
   * @param page
   * @param perPage
   * @param excludedPolicyIds
   * @returns Uninstall Tokens Metadata Response
   */
  getTokenMetadata(
    policyIdSearchTerm?: string,
    policyNameSearchTerm?: string,
    page?: number,
    perPage?: number,
    excludedPolicyIds?: string[]
  ): Promise<GetUninstallTokensMetadataResponse>;

  /**
   * Get hashed uninstall token for given policy id
   *
   * @param policyId agent policy id
   * @returns hashedToken
   */
  getHashedTokenForPolicyId(policyId: string): Promise<string>;

  /**
   * Get hashed uninstall tokens for given policy ids
   *
   * @param policyIds agent policy ids
   * @returns Record<policyId, hashedToken>
   */
  getHashedTokensForPolicyIds(policyIds?: string[]): Promise<Record<string, string>>;

  /**
   * Get hashed uninstall token for all policies
   *
   * @returns Record<policyId, hashedToken>
   */
  getAllHashedTokens(): Promise<Record<string, string>>;

  /**
   * Generate uninstall token for given policy id
   * Will not create a new token if one already exists for a given policy unless force: true is used
   *
   * @param policyId agent policy id
   * @param force generate a new token even if one already exists
   * @returns hashedToken
   */
  generateTokenForPolicyId(policyId: string, force?: boolean): Promise<void>;

  /**
   * Generate uninstall tokens for given policy ids
   * Will not create a new token if one already exists for a given policy unless force: true is used
   *
   * @param policyIds agent policy ids
   * @param force generate a new token even if one already exists
   * @returns Record<policyId, hashedToken>
   */
  generateTokensForPolicyIds(policyIds: string[], force?: boolean): Promise<void>;

  /**
   * Generate uninstall tokens all policies
   * Will not create a new token if one already exists for a given policy unless force: true is used
   *
   * @param force generate a new token even if one already exists
   * @returns Record<policyId, hashedToken>
   */
  generateTokensForAllPolicies(force?: boolean): Promise<void>;

  /**
   * If encryption is available, checks for any plain text uninstall tokens and encrypts them
   */
  encryptTokens(): Promise<void>;

  /**
   * Check whether the selected policy has a valid uninstall token. Rejects returning promise if not.
   *
   * @param policyId policy Id to check
   */
  checkTokenValidityForPolicy(policyId: string): Promise<UninstallTokenInvalidError | null>;

  /**
   * Check whether all policies have a valid uninstall token. Rejects returning promise if not.
   *
   */
  checkTokenValidityForAllPolicies(): Promise<UninstallTokenInvalidError | null>;
}

export class UninstallTokenService implements UninstallTokenServiceInterface {
  private _soClient: SavedObjectsClientContract | undefined;

  constructor(private esoClient: EncryptedSavedObjectsClient) {}

  public async getToken(id: string): Promise<UninstallToken | null> {
    const filter = `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.id: "${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}:${id}"`;

    const tokenObjects = await this.getDecryptedTokenObjects({ filter });

    return tokenObjects.length === 1
      ? this.convertTokenObjectToToken(
          await this.getPolicyIdNameDictionary([tokenObjects[0].attributes.policy_id]),
          tokenObjects[0]
        )
      : null;
  }

  private prepareSearchString(str: string | undefined, wildcard: string): string | undefined {
    const strWithoutSpecialCharacters = str
      ?.split(/[^-\da-z]+/gi)
      .filter((x) => x)
      .join(wildcard);

    return strWithoutSpecialCharacters
      ? wildcard + strWithoutSpecialCharacters + wildcard
      : undefined;
  }

  private async searchPoliciesByName(policyNameSearchString: string): Promise<string[]> {
    const policyNameFilter = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.attributes.name:${policyNameSearchString}`;

    const agentPoliciesSOs = await this.soClient.find<AgentPolicySOAttributes>({
      type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      filter: policyNameFilter,
    });

    return agentPoliciesSOs.saved_objects.map((attr) => attr.id);
  }

  public async getTokenMetadata(
    policyIdSearchTerm?: string,
    policyNameSearchTerm?: string,
    page = 1,
    perPage = 20,
    excludedPolicyIds?: string[]
  ): Promise<GetUninstallTokensMetadataResponse> {
    const policyIdFilter = this.prepareSearchString(policyIdSearchTerm, '.*');

    let policyIdsFoundByName: string[] | undefined;
    const policyNameSearchString = this.prepareSearchString(policyNameSearchTerm, '*');
    if (policyNameSearchString) {
      policyIdsFoundByName = await this.searchPoliciesByName(policyNameSearchString);
    }

    let includeFilter: string | undefined;
    if (policyIdFilter || policyIdsFoundByName) {
      includeFilter = [
        ...(policyIdsFoundByName ? policyIdsFoundByName : []),
        ...(policyIdFilter ? [policyIdFilter] : []),
      ].join('|');
    }

    const tokenObjects = await this.getTokenObjectsByPolicyIdFilter(
      includeFilter,
      excludedPolicyIds
    );
    const tokenObjectsCurrentPage = tokenObjects.slice((page - 1) * perPage, page * perPage);
    const policyIds = tokenObjectsCurrentPage.map(
      (tokenObject) => tokenObject._source[UNINSTALL_TOKENS_SAVED_OBJECT_TYPE].policy_id
    );
    const policyIdNameDictionary = await this.getPolicyIdNameDictionary(policyIds);

    const items: UninstallTokenMetadata[] = tokenObjectsCurrentPage.map<UninstallTokenMetadata>(
      ({ _id, _source }) => {
        this.assertPolicyId(_source[UNINSTALL_TOKENS_SAVED_OBJECT_TYPE]);
        this.assertCreatedAt(_source.created_at);
        const policyId = _source[UNINSTALL_TOKENS_SAVED_OBJECT_TYPE].policy_id;

        return {
          id: _id.replace(`${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}:`, ''),
          policy_id: policyId,
          policy_name: policyIdNameDictionary[policyId] ?? null,
          created_at: _source.created_at,
        };
      }
    );

    return { items, total: tokenObjects.length, page, perPage };
  }

  private async getPolicyIdNameDictionary(policyIds: string[]): Promise<Record<string, string>> {
    const agentPolicies = await agentPolicyService.getByIDs(this.soClient, policyIds, {
      ignoreMissing: true,
    });

    return agentPolicies.reduce((dict, policy) => {
      dict[policy.id] = policy.name;
      return dict;
    }, {} as Record<string, string>);
  }

  private async getDecryptedTokensForPolicyIds(policyIds: string[]): Promise<UninstallToken[]> {
    const tokenObjects = await this.getDecryptedTokenObjectsForPolicyIds(policyIds);
    const policyIdNameDictionary = await this.getPolicyIdNameDictionary(
      tokenObjects.map((obj) => obj.attributes.policy_id)
    );

    return tokenObjects.map((tokenObject) =>
      this.convertTokenObjectToToken(policyIdNameDictionary, tokenObject)
    );
  }

  private async getDecryptedTokenObjectsForPolicyIds(
    policyIds: string[]
  ): Promise<Array<SavedObjectsFindResult<UninstallTokenSOAttributes>>> {
    const tokenObjectHits = await this.getTokenObjectsByPolicyIdFilter(policyIds);

    if (tokenObjectHits.length === 0) {
      return [];
    }

    const filterEntries: string[] = tokenObjectHits.map(
      ({ _id }) => `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.id: "${_id}"`
    );

    let tokenObjectChunks: Array<Array<SavedObjectsFindResult<UninstallTokenSOAttributes>>> = [];

    try {
      tokenObjectChunks = await asyncMap(
        chunk(filterEntries, this.getUninstallTokenVerificationBatchSize()),
        async (entries) => {
          const filter = entries.join(' or ');
          return this.getDecryptedTokenObjects({ filter });
        }
      );
    } catch (error) {
      if (isResponseError(error) && error.message.includes('too_many_nested_clauses')) {
        // `too_many_nested_clauses` is considered non-fatal
        const errorMessage =
          'Failed to validate uninstall tokens: `too_many_nested_clauses` error received. ' +
          'Setting/decreasing the value of `xpack.fleet.setup.uninstallTokenVerificationBatchSize` in your kibana.yml should help. ' +
          `Current value is ${this.getUninstallTokenVerificationBatchSize()}.`;

        appContextService.getLogger().warn(`${errorMessage}: '${error}'`);

        throw new UninstallTokenError(errorMessage);
      } else {
        throw error;
      }
    }

    return tokenObjectChunks.flat();
  }

  private getUninstallTokenVerificationBatchSize = () => {
    /** If `uninstallTokenVerificationBatchSize` is too large, we get an error of `too_many_nested_clauses`.
     *  Assuming that `max_clause_count` >= 1024, and experiencing that batch size should be less than half
     *  than `max_clause_count` with our current query, batch size below 512 should be okay on every env.
     */
    const config = appContextService.getConfig();

    return config?.setup?.uninstallTokenVerificationBatchSize ?? 500;
  };

  private async getDecryptedTokenObjects(
    options: Partial<SavedObjectsCreatePointInTimeFinderOptions>
  ): Promise<Array<SavedObjectsFindResult<UninstallTokenSOAttributes>>> {
    const tokensFinder =
      await this.esoClient.createPointInTimeFinderDecryptedAsInternalUser<UninstallTokenSOAttributes>(
        {
          type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
          perPage: SO_SEARCH_LIMIT,
          ...options,
        }
      );
    let tokenObjects: Array<SavedObjectsFindResult<UninstallTokenSOAttributes>> = [];

    for await (const result of tokensFinder.find()) {
      tokenObjects = result.saved_objects;
      break;
    }
    tokensFinder.close();

    return tokenObjects;
  }

  private convertTokenObjectToToken = (
    policyIdNameDictionary: Record<string, string>,
    {
      id: _id,
      attributes,
      created_at: createdAt,
      error,
    }: SavedObjectsFindResult<UninstallTokenSOAttributes>
  ): UninstallToken => {
    if (error) {
      throw new UninstallTokenError(`Error when reading Uninstall Token with id '${_id}'.`);
    }

    this.assertPolicyId(attributes);
    this.assertToken(attributes);
    this.assertCreatedAt(createdAt);

    return {
      id: _id,
      policy_id: attributes.policy_id,
      policy_name: policyIdNameDictionary[attributes.policy_id] ?? null,
      token: attributes.token || attributes.token_plain,
      created_at: createdAt,
    };
  };

  private async getTokenObjectsByPolicyIdFilter(
    include?: AggregationsTermsInclude,
    exclude?: AggregationsTermsExclude
  ): Promise<Array<SearchHit<any>>> {
    const bucketSize = 10000;

    const query: SavedObjectsCreatePointInTimeFinderOptions = {
      type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
      perPage: 0,
      aggs: {
        by_policy_id: {
          terms: {
            field: `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.policy_id`,
            size: bucketSize,
            include,
            exclude,
          },
          aggs: {
            latest: {
              top_hits: {
                size: 1,
                sort: [{ created_at: { order: 'desc' } }],
                _source: [`${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.policy_id`, 'created_at'],
              },
            },
          },
        },
      },
    };

    // encrypted saved objects doesn't decrypt aggregation values so we get
    // the ids first from saved objects to use with encrypted saved objects
    const idFinder = this.soClient.createPointInTimeFinder<
      UninstallTokenSOAttributes,
      UninstallTokenSOAggregation
    >(query);

    let aggResults: UninstallTokenSOAggregationBucket[] = [];
    for await (const result of idFinder.find()) {
      if (
        !result?.aggregations?.by_policy_id.buckets ||
        !Array.isArray(result?.aggregations?.by_policy_id.buckets)
      ) {
        break;
      }
      aggResults = result.aggregations.by_policy_id.buckets;
      break;
    }

    const getCreatedAt = (soBucket: UninstallTokenSOAggregationBucket) =>
      new Date(soBucket.latest.hits.hits[0]._source?.created_at ?? Date.now()).getTime();

    // sorting and paginating buckets is done here instead of ES,
    // because SO query doesn't support `bucket_sort`
    aggResults.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));

    return aggResults.map((bucket) => bucket.latest.hits.hits[0]);
  }

  public async getHashedTokenForPolicyId(policyId: string): Promise<string> {
    return (await this.getHashedTokensForPolicyIds([policyId]))[policyId];
  }

  public async getHashedTokensForPolicyIds(policyIds: string[]): Promise<Record<string, string>> {
    const tokens = await this.getDecryptedTokensForPolicyIds(policyIds);
    return tokens.reduce((acc, { policy_id: policyId, token }) => {
      if (policyId && token) {
        acc[policyId] = this.hashToken(token);
      }
      return acc;
    }, {} as Record<string, string>);
  }

  public async getAllHashedTokens(): Promise<Record<string, string>> {
    const policyIds = await this.getAllPolicyIds();
    return this.getHashedTokensForPolicyIds(policyIds);
  }

  public generateTokenForPolicyId(policyId: string, force: boolean = false): Promise<void> {
    return this.generateTokensForPolicyIds([policyId], force);
  }

  public async generateTokensForPolicyIds(
    policyIds: string[],
    force: boolean = false
  ): Promise<void> {
    const { agentTamperProtectionEnabled } = appContextService.getExperimentalFeatures();

    if (!agentTamperProtectionEnabled || !policyIds.length) {
      return;
    }

    const existingTokens = new Set();

    if (!force) {
      (await this.getTokenObjectsByPolicyIdFilter(policyIds)).forEach((tokenObject) => {
        existingTokens.add(tokenObject._source[UNINSTALL_TOKENS_SAVED_OBJECT_TYPE].policy_id);
      });
    }
    const missingTokenPolicyIds = force
      ? policyIds
      : policyIds.filter((policyId) => !existingTokens.has(policyId));

    const newTokensMap = missingTokenPolicyIds.reduce((acc, policyId) => {
      const token = this.generateToken();
      return {
        ...acc,
        [policyId]: token,
      };
    }, {} as Record<string, string>);
    await this.persistTokens(missingTokenPolicyIds, newTokensMap);
    if (force) {
      const config = appContextService.getConfig();
      const batchSize = config?.setup?.agentPolicySchemaUpgradeBatchSize ?? 100;
      asyncForEach(
        chunk(policyIds, batchSize),
        async (policyIdsBatch) =>
          await agentPolicyService.deployPolicies(this.soClient, policyIdsBatch)
      );
    }
  }

  public async generateTokensForAllPolicies(force: boolean = false): Promise<void> {
    const policyIds = await this.getAllPolicyIds();
    return this.generateTokensForPolicyIds(policyIds, force);
  }

  public async encryptTokens(): Promise<void> {
    if (!this.isEncryptionAvailable) {
      return;
    }

    const { saved_objects: unencryptedTokenObjects } =
      await this.soClient.find<UninstallTokenSOAttributes>({
        type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
        filter: `${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.token_plain:* AND (NOT ${UNINSTALL_TOKENS_SAVED_OBJECT_TYPE}.attributes.token_plain: "")`,
      });

    if (!unencryptedTokenObjects.length) {
      return;
    }

    const bulkUpdateObjects: Array<SavedObjectsBulkUpdateObject<UninstallTokenSOAttributes>> = [];
    for (const unencryptedTokenObject of unencryptedTokenObjects) {
      bulkUpdateObjects.push({
        ...unencryptedTokenObject,
        attributes: {
          ...unencryptedTokenObject.attributes,
          token: unencryptedTokenObject.attributes.token_plain,
          token_plain: '',
        },
      });
    }

    await this.soClient.bulkUpdate(bulkUpdateObjects);
  }

  private async getAllPolicyIds(): Promise<string[]> {
    const agentPolicyIdsFetcher = agentPolicyService.fetchAllAgentPolicyIds(this.soClient);
    const policyIds: string[] = [];
    for await (const agentPolicyId of agentPolicyIdsFetcher) {
      policyIds.push(...agentPolicyId);
    }

    return policyIds;
  }

  private async persistTokens(
    policyIds: string[],
    tokensMap: Record<string, string>
  ): Promise<void> {
    if (!policyIds.length) {
      return;
    }

    const config = appContextService.getConfig();
    const batchSize = config?.setup?.agentPolicySchemaUpgradeBatchSize ?? 100;

    await asyncForEach(chunk(policyIds, batchSize), async (policyIdsBatch) => {
      await this.soClient.bulkCreate<Partial<UninstallTokenSOAttributes>>(
        policyIdsBatch.map((policyId) => ({
          type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
          attributes: this.isEncryptionAvailable
            ? {
                policy_id: policyId,
                token: tokensMap[policyId],
              }
            : {
                policy_id: policyId,
                token_plain: tokensMap[policyId],
              },
        }))
      );
    });
  }

  private generateToken(): string {
    return randomBytes(16).toString('hex');
  }

  private hashToken(token: string): string {
    if (!token) {
      return '';
    }
    const hash = createHash('sha256');
    hash.update(token);
    return hash.digest('base64');
  }

  private get soClient() {
    if (this._soClient) {
      return this._soClient;
    }

    const fakeRequest = {
      headers: {},
      getBasePath: () => '',
      path: '/',
      route: { settings: {} },
      url: { href: {} },
      raw: { req: { url: '/' } },
    } as unknown as KibanaRequest;

    this._soClient = appContextService.getSavedObjects().getScopedClient(fakeRequest, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes: [UNINSTALL_TOKENS_SAVED_OBJECT_TYPE],
    });

    return this._soClient;
  }

  public async checkTokenValidityForPolicy(
    policyId: string
  ): Promise<UninstallTokenInvalidError | null> {
    return await this.checkTokenValidityForPolicies([policyId]);
  }

  public async checkTokenValidityForAllPolicies(): Promise<UninstallTokenInvalidError | null> {
    const policyIds = await this.getAllPolicyIds();
    return await this.checkTokenValidityForPolicies(policyIds);
  }

  private async checkTokenValidityForPolicies(
    policyIds: string[]
  ): Promise<UninstallTokenInvalidError | null> {
    try {
      const tokenObjects = await this.getDecryptedTokenObjectsForPolicyIds(policyIds);

      const numberOfDecryptionErrors = tokenObjects.filter(({ error }) => error).length;
      if (numberOfDecryptionErrors > 0) {
        return {
          error: new UninstallTokenError(
            `Failed to decrypt ${numberOfDecryptionErrors} of ${tokenObjects.length} Uninstall Token(s)`
          ),
        };
      }

      const numberOfTokensWithMissingData = tokenObjects.filter(
        ({ attributes, created_at: createdAt }) =>
          !createdAt || !attributes.policy_id || (!attributes.token && !attributes.token_plain)
      ).length;
      if (numberOfTokensWithMissingData > 0) {
        return {
          error: new UninstallTokenError(
            `Failed to validate Uninstall Tokens: ${numberOfTokensWithMissingData} of ${tokenObjects.length} tokens are invalid`
          ),
        };
      }
    } catch (error) {
      if (error instanceof UninstallTokenError) {
        // known errors are considered non-fatal
        return { error };
      } else {
        const errorMessage = 'Unknown error happened while checking Uninstall Tokens validity';
        appContextService.getLogger().error(`${errorMessage}: '${error}'`);
        throw new UninstallTokenError(errorMessage);
      }
    }

    return null;
  }

  private get isEncryptionAvailable(): boolean {
    return appContextService.getEncryptedSavedObjectsSetup()?.canEncrypt ?? false;
  }

  private assertCreatedAt(createdAt: string | undefined): asserts createdAt is string {
    if (!createdAt) {
      throw new UninstallTokenError(
        'Invalid uninstall token: Saved object is missing creation date.'
      );
    }
  }

  private assertToken(attributes: UninstallTokenSOAttributes | undefined) {
    if (!attributes?.token && !attributes?.token_plain) {
      throw new UninstallTokenError(
        'Invalid uninstall token: Saved object is missing the token attribute.'
      );
    }
  }

  private assertPolicyId(attributes: UninstallTokenSOAttributes | undefined) {
    if (!attributes?.policy_id) {
      throw new UninstallTokenError(
        'Invalid uninstall token: Saved object is missing the policy id attribute.'
      );
    }
  }
}
