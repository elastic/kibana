/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { errors } from '@elastic/elasticsearch';
import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import { toElasticsearchQuery } from '@kbn/es-query';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { ESSearchResponse as SearchResponse } from '@kbn/es-types';

import { ALL_SPACES_ID } from '../../../common/constants';
import type { EnrollmentAPIKey, FleetServerEnrollmentAPIKey } from '../../types';
import { FleetError, EnrollmentKeyNameExistsError, EnrollmentKeyNotFoundError } from '../../errors';
import { ENROLLMENT_API_KEYS_INDEX } from '../../constants';
import { agentPolicyService } from '../agent_policy';
import { escapeSearchQueryPhrase } from '../saved_object';
import { auditLoggingService } from '../audit_logging';
import { _joinFilters } from '../agents';
import { appContextService } from '../app_context';
import { isSpaceAwarenessEnabled } from '../spaces/helpers';
import { DEFAULT_NAMESPACES_FILTER } from '../spaces/agent_namespaces';

import { invalidateAPIKeys } from './security';

const uuidRegex =
  /^\([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\)$/;

export async function listEnrollmentApiKeys(
  esClient: ElasticsearchClient,
  options: {
    page?: number;
    perPage?: number;
    kuery?: string;
    query?: ReturnType<typeof toElasticsearchQuery>;
    showInactive?: boolean;
    spaceId?: string;
  }
): Promise<{ items: EnrollmentAPIKey[]; total: any; page: any; perPage: any }> {
  const { page = 1, perPage = 20, kuery, spaceId } = options;
  // const query = options.query ?? (kuery && toElasticsearchQuery(fromKueryExpression(kuery)));

  let query: ReturnType<typeof toElasticsearchQuery> | undefined;
  if (options.query && spaceId) {
    throw new Error('not implemented (query should only be used in Fleet internal usage)');
  }
  if (!options.query) {
    const filters: string[] = [];

    if (kuery) {
      filters.push(kuery);
    }

    const useSpaceAwareness = await isSpaceAwarenessEnabled();
    if (useSpaceAwareness && spaceId) {
      if (spaceId === DEFAULT_SPACE_ID) {
        filters.push(DEFAULT_NAMESPACES_FILTER);
      } else {
        filters.push(`namespaces:"${spaceId}" or namespaces:"${ALL_SPACES_ID}"`);
      }
    }

    const kueryNode = _joinFilters(filters);
    query = kueryNode ? toElasticsearchQuery(kueryNode) : undefined;
  } else {
    query = options.query;
  }

  const res = await esClient.search<SearchResponse<FleetServerEnrollmentAPIKey, {}>>({
    index: ENROLLMENT_API_KEYS_INDEX,
    from: (page - 1) * perPage,
    size: perPage,
    track_total_hits: true,
    rest_total_hits_as_int: true,
    ignore_unavailable: true,
    sort: [{ created_at: { order: 'desc' } }],
    ...(query ? { query } : {}),
  });

  // @ts-expect-error @elastic/elasticsearch _source is optional
  const items = res.hits.hits.map(esDocToEnrollmentApiKey);

  return {
    items,
    total: res.hits.total as number,
    page,
    perPage,
  };
}

export async function hasEnrollementAPIKeysForPolicy(
  esClient: ElasticsearchClient,
  policyId: string
) {
  const res = await listEnrollmentApiKeys(esClient, {
    kuery: `policy_id:"${policyId}"`,
  });

  return res.total !== 0;
}

export async function getEnrollmentAPIKey(
  esClient: ElasticsearchClient,
  id: string,
  spaceId?: string
): Promise<EnrollmentAPIKey> {
  try {
    const body = await esClient.get<FleetServerEnrollmentAPIKey>({
      index: ENROLLMENT_API_KEYS_INDEX,
      id,
    });

    if (spaceId) {
      if (body._source?.namespaces?.includes(ALL_SPACES_ID)) {
        // Do nothing all spaces have access to this key
      } else if (spaceId === DEFAULT_SPACE_ID) {
        if (
          (body._source?.namespaces?.length ?? 0) > 0 &&
          !body._source?.namespaces?.includes(DEFAULT_SPACE_ID)
        ) {
          throw new EnrollmentKeyNotFoundError(`Enrollment api key ${id} not found in namespace`);
        }
      } else if (!body._source?.namespaces?.includes(spaceId)) {
        throw new EnrollmentKeyNotFoundError(`Enrollment api key ${id} not found in namespace`);
      }
    }

    // @ts-expect-error esDocToEnrollmentApiKey doesn't accept optional _source
    return esDocToEnrollmentApiKey(body);
  } catch (e) {
    if (e instanceof errors.ResponseError && e.statusCode === 404) {
      throw new EnrollmentKeyNotFoundError(`Enrollment api key ${id} not found`);
    }

    throw e;
  }
}

/**
 * forceDelete=false (revoke): invalidate the ES API key and set active=false on the enrollment token document.
 * forceDelete=true (delete): invalidate the ES API key and delete the enrollment token document from the index.
 */
export async function deleteEnrollmentApiKeys(
  esClient: ElasticsearchClient,
  ids: string[],
  forceDelete = false,
  spaceId?: string,
  includeHidden = false
): Promise<{ successCount: number; errorCount: number }> {
  if (ids.length === 0) return { successCount: 0, errorCount: 0 };

  const logger = appContextService.getLogger();
  logger.debug(`Deleting ${ids.length} enrollment API key(s) [forceDelete=${forceDelete}]`);

  const docs = await esClient.mget<FleetServerEnrollmentAPIKey>({
    index: ENROLLMENT_API_KEYS_INDEX,
    ids,
  });

  const notFound = ids.filter(
    (id) => !docs.docs.some((doc) => doc._id === id && 'found' in doc && doc.found)
  );
  if (notFound.length > 0) {
    logger.warn(`Enrollment API keys not found: ${notFound.join(', ')}`);
  }

  const enrollmentKeys: EnrollmentAPIKey[] = [];
  for (const doc of docs.docs) {
    if (!('found' in doc) || !doc.found || !doc._source) continue;
    const key = esDocToEnrollmentApiKey(
      doc as { _id: string; _source: FleetServerEnrollmentAPIKey }
    );

    if (key.hidden && !includeHidden) continue;

    if (spaceId) {
      const namespaces = doc._source.namespaces;
      if (namespaces?.includes(ALL_SPACES_ID)) {
        // all spaces have access
      } else if (spaceId === DEFAULT_SPACE_ID) {
        if ((namespaces?.length ?? 0) > 0 && !namespaces?.includes(DEFAULT_SPACE_ID)) continue;
      } else if (!namespaces?.includes(spaceId)) {
        continue;
      }
    }

    enrollmentKeys.push(key);
  }

  if (enrollmentKeys.length === 0) return { successCount: 0, errorCount: 0 };

  for (const key of enrollmentKeys) {
    auditLoggingService.writeCustomAuditLog({
      message: `User deleting enrollment API key [id=${key.id}] [api_key_id=${key.api_key_id}] [forceDelete=${forceDelete}]`,
    });
  }

  const activeKeys = enrollmentKeys.filter((k) => k.active);
  const failedToInvalidate = new Set<string>();

  if (activeKeys.length > 0) {
    const invalidateRes = await invalidateAPIKeys(activeKeys.map((k) => k.api_key_id));

    logger.debug(
      `API key invalidation response: invalidated=${
        invalidateRes?.invalidated_api_keys?.length ?? 0
      }, previously_invalidated=${
        invalidateRes?.previously_invalidated_api_keys?.length ?? 0
      }, error_count=${invalidateRes?.error_count ?? 0}`
    );

    if (invalidateRes?.error_count && invalidateRes.error_count > 0) {
      logger.warn(`API key invalidation errors: ${JSON.stringify(invalidateRes.error_details)}`);
    }

    const invalidatedKeyIds = new Set([
      ...(invalidateRes?.invalidated_api_keys ?? []),
      ...(invalidateRes?.previously_invalidated_api_keys ?? []),
    ]);

    const failed = activeKeys.filter((k) => !invalidatedKeyIds.has(k.api_key_id));
    if (failed.length > 0) {
      if (forceDelete) {
        logger.warn(
          `Failed to invalidate ${
            failed.length
          } API key(s) during delete, proceeding with document removal: ${failed
            .map((k) => k.id)
            .join(', ')}`
        );
      } else {
        for (const k of failed) failedToInvalidate.add(k.id);
        logger.warn(
          `Skipping ${
            failed.length
          } active enrollment API key(s) whose API keys failed to invalidate: ${failed
            .map((k) => k.id)
            .join(', ')}`
        );
      }
    }
  }

  const keysToProcess = enrollmentKeys.filter((k) => !failedToInvalidate.has(k.id));
  const invalidationErrors = failedToInvalidate.size;

  if (keysToProcess.length === 0) {
    return { successCount: 0, errorCount: invalidationErrors };
  }

  const bulkBody = forceDelete
    ? keysToProcess.map((key) => ({ delete: { _index: ENROLLMENT_API_KEYS_INDEX, _id: key.id } }))
    : keysToProcess.flatMap((key) => [
        { update: { _index: ENROLLMENT_API_KEYS_INDEX, _id: key.id } },
        { doc: { active: false } },
      ]);

  const bulkRes = await esClient.bulk({ body: bulkBody, refresh: 'wait_for' });
  if (bulkRes.errors) {
    const failedItems = bulkRes.items.filter((item) => item.delete?.error || item.update?.error);
    for (const item of failedItems) {
      const op = item.delete ?? item.update;
      logger.warn(
        `Failed to ${forceDelete ? 'delete' : 'revoke'} enrollment API key ${
          op?._id
        }: ${JSON.stringify(op?.error)}`
      );
    }
  }

  const bulkErrors = bulkRes.errors
    ? bulkRes.items.filter((item) => item.delete?.error || item.update?.error).length
    : 0;
  const errorCount = invalidationErrors + bulkErrors;
  const successCount = keysToProcess.length - bulkErrors;

  logger.debug(
    `Processed ${successCount}/${enrollmentKeys.length} enrollment API key(s) [forceDelete=${forceDelete}], errors: ${errorCount}`
  );

  return { successCount, errorCount };
}

export async function deleteEnrollmentApiKeyForAgentPolicyId(
  esClient: ElasticsearchClient,
  agentPolicyId: string
) {
  await bulkDeleteEnrollmentApiKeys(esClient, {
    kuery: `policy_id:"${agentPolicyId}"`,
    forceDelete: true,
    includeHidden: true,
  });
}

export async function bulkDeleteEnrollmentApiKeys(
  esClient: ElasticsearchClient,
  options: {
    tokenIds?: string[];
    kuery?: string;
    forceDelete?: boolean;
    spaceId?: string;
    includeHidden?: boolean;
  }
): Promise<{ count: number; successCount: number; errorCount: number }> {
  const { tokenIds, kuery, forceDelete = false, spaceId, includeHidden = false } = options;
  let successCount = 0;
  let errorCount = 0;

  if (tokenIds && tokenIds.length > 0) {
    const result = await deleteEnrollmentApiKeys(
      esClient,
      tokenIds,
      forceDelete,
      spaceId,
      includeHidden
    );
    successCount = result.successCount;
    errorCount = result.errorCount;
  } else if (kuery) {
    const { items } = await listEnrollmentApiKeys(esClient, {
      page: 1,
      perPage: 10000,
      kuery,
      spaceId,
    });

    const allIds = items.map((k) => k.id);
    const BATCH_SIZE = 1000;
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const result = await deleteEnrollmentApiKeys(
        esClient,
        allIds.slice(i, i + BATCH_SIZE),
        forceDelete,
        spaceId,
        includeHidden
      );
      successCount += result.successCount;
      errorCount += result.errorCount;
    }
  }

  return { count: successCount, successCount, errorCount };
}

export async function generateEnrollmentAPIKey(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  data: {
    name?: string;
    expiration?: string;
    agentPolicyId: string;
    forceRecreate?: boolean;
  }
): Promise<EnrollmentAPIKey> {
  const id = uuidv4();
  const { name: providedKeyName, forceRecreate, agentPolicyId } = data;
  const logger = appContextService.getLogger();
  logger.debug(`Creating enrollment API key ${JSON.stringify(data)}`);

  const agentPolicy = await retrieveAgentPolicyId(soClient, agentPolicyId);

  if (providedKeyName && !forceRecreate) {
    let hasMore = true;
    let page = 1;
    let keys: EnrollmentAPIKey[] = [];
    while (hasMore) {
      const { items } = await listEnrollmentApiKeys(esClient, {
        page: page++,
        perPage: 100,
        query: getQueryForExistingKeyNameOnPolicy(agentPolicyId, providedKeyName),
      });
      if (items.length === 0) {
        hasMore = false;
      } else {
        keys = keys.concat(items);
      }
    }

    if (
      keys.length > 0 &&
      keys.some((k: EnrollmentAPIKey) =>
        // Prevent false positives when the providedKeyName is a prefix of a token name that already exists
        // After removing the providedKeyName and trimming whitespace, the only string left should be a uuid in parens.
        k.name?.replace(providedKeyName, '').trim().match(uuidRegex)
      )
    ) {
      throw new EnrollmentKeyNameExistsError(
        i18n.translate('xpack.fleet.serverError.enrollmentKeyDuplicate', {
          defaultMessage:
            'An enrollment key named {providedKeyName} already exists for agent policy {agentPolicyId}',
          values: {
            providedKeyName,
            agentPolicyId,
          },
        })
      );
    }
  }

  const name = providedKeyName ? `${providedKeyName} (${id})` : id;

  auditLoggingService.writeCustomAuditLog({
    message: `User creating enrollment API key [name=${name}] [policy_id=${agentPolicyId}]`,
  });
  logger.debug(`Creating enrollment API key [name=${name}] [policy_id=${agentPolicyId}]`);

  const key = await esClient.security
    .createApiKey({
      name,
      metadata: {
        managed_by: 'fleet',
        managed: true,
        type: 'enroll',
        policy_id: data.agentPolicyId,
      },
      role_descriptors: {
        // Useless role to avoid to have the privilege of the user that created the key
        'fleet-apikey-enroll': {
          cluster: [],
          index: [],
          applications: [
            {
              application: 'fleet',
              privileges: ['no-privileges'],
              resources: ['*'],
            },
          ],
        },
      },
    })
    .catch((err) => {
      throw new FleetError(`Impossible to create an api key: ${err.message}`);
    });

  if (!key) {
    throw new FleetError(
      i18n.translate('xpack.fleet.serverError.unableToCreateEnrollmentKey', {
        defaultMessage: 'Unable to create an enrollment api key',
      })
    );
  }

  const apiKey = Buffer.from(`${key.id}:${key.api_key}`).toString('base64');

  const body = {
    active: true,
    api_key_id: key.id,
    api_key: apiKey,
    name,
    policy_id: agentPolicyId,
    namespaces: agentPolicy?.space_ids,
    created_at: new Date().toISOString(),
    hidden: agentPolicy?.supports_agentless || agentPolicy?.is_managed,
  };

  const res = await esClient.create({
    index: ENROLLMENT_API_KEYS_INDEX,
    body,
    id,
    refresh: 'wait_for',
  });

  const enrollmentAPIKey: EnrollmentAPIKey = {
    id: res._id,
    api_key_id: body.api_key_id,
    api_key: body.api_key,
    name: body.name,
    active: body.active,
    policy_id: body.policy_id,
    created_at: body.created_at,
  };

  return enrollmentAPIKey;
}

export async function ensureDefaultEnrollmentAPIKeyForAgentPolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicyId: string
) {
  const hasKey = await hasEnrollementAPIKeysForPolicy(esClient, agentPolicyId);

  if (hasKey) {
    return;
  }

  return generateEnrollmentAPIKey(soClient, esClient, {
    name: `Default`,
    agentPolicyId,
    forceRecreate: true, // Always generate a new enrollment key when Fleet is being set up
  });
}

function getQueryForExistingKeyNameOnPolicy(agentPolicyId: string, providedKeyName: string) {
  const query = {
    bool: {
      filter: [
        {
          bool: {
            should: [{ match_phrase: { policy_id: agentPolicyId } }],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [
              {
                query_string: {
                  fields: ['name'],
                  query: `(${providedKeyName.replace('!', '\\!')}) *`,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  };

  return query;
}

export async function getEnrollmentAPIKeyById(esClient: ElasticsearchClient, apiKeyId: string) {
  const res = await esClient.search<FleetServerEnrollmentAPIKey>({
    index: ENROLLMENT_API_KEYS_INDEX,
    ignore_unavailable: true,
    q: `api_key_id:${escapeSearchQueryPhrase(apiKeyId)}`,
  });

  // @ts-expect-error esDocToEnrollmentApiKey doesn't accept optional _source
  const [enrollmentAPIKey] = res.hits.hits.map(esDocToEnrollmentApiKey);

  if (enrollmentAPIKey?.api_key_id !== apiKeyId) {
    throw new FleetError(
      i18n.translate('xpack.fleet.serverError.returnedIncorrectKey', {
        defaultMessage: 'Find enrollmentKeyById returned an incorrect key',
      })
    );
  }

  return enrollmentAPIKey;
}

async function retrieveAgentPolicyId(soClient: SavedObjectsClientContract, agentPolicyId: string) {
  return agentPolicyService.get(soClient, agentPolicyId).catch(async (e) => {
    if (e.isBoom && e.output.statusCode === 404) {
      throw Boom.badRequest(
        i18n.translate('xpack.fleet.serverError.agentPolicyDoesNotExist', {
          defaultMessage: 'Agent policy {agentPolicyId} does not exist',
          values: { agentPolicyId },
        })
      );
    }
    throw e;
  });
}

function esDocToEnrollmentApiKey(doc: {
  _id: string;
  _source: FleetServerEnrollmentAPIKey;
}): EnrollmentAPIKey {
  return {
    id: doc._id,
    api_key_id: doc._source.api_key_id,
    api_key: doc._source.api_key,
    name: doc._source.name,
    policy_id: doc._source.policy_id,
    created_at: doc._source.created_at as string,
    active: doc._source.active || false,
    hidden: doc._source.hidden || false,
  };
}
