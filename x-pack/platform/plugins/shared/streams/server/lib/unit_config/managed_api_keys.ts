/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { STREAMS_DEFAULT_UNIT_ID } from '../../../common/constants';
import { STREAMS_DESTINATIONS_MANAGED_BY } from '../../routes/internal/streams/destinations/helpers';
import { STREAMS_SOURCES_MANAGED_BY } from '../../routes/internal/streams/sources/helpers';

const QUERY_PAGE_SIZE = 1000;
const MANAGE_ALL_API_KEYS_PRIVILEGE = 'manage_api_key';
const MANAGE_OWN_API_KEYS_PRIVILEGE = 'manage_own_api_key';

export const queryManagedApiKeyIds = async ({
  client,
  filter,
}: {
  client: ElasticsearchClient;
  filter: QueryDslQueryContainer[];
}): Promise<string[]> => {
  const ids: string[] = [];
  let from = 0;

  while (true) {
    const response = await client.security.queryApiKeys({
      from,
      size: QUERY_PAGE_SIZE,
      query: {
        bool: { filter },
      },
    });
    ids.push(...response.api_keys.map((apiKey) => apiKey.id));
    if (response.api_keys.length < QUERY_PAGE_SIZE) {
      break;
    }
    from += QUERY_PAGE_SIZE;
  }

  return ids;
};

export const invalidateApiKeyIds = async ({
  client,
  ids,
}: {
  client: ElasticsearchClient;
  ids: string[];
}): Promise<{ invalidatedApiKeys: string[]; errorCount: number }> => {
  if (ids.length === 0) {
    return { invalidatedApiKeys: [], errorCount: 0 };
  }
  const { invalidated_api_keys: invalidatedApiKeys, error_count: errorCount } =
    await client.security.invalidateApiKey({ ids });
  return { invalidatedApiKeys, errorCount };
};

const idTermsFilter = (field: string, ids: string[]): QueryDslQueryContainer =>
  ids.length === 1 ? { term: { [field]: ids[0] } } : { terms: { [field]: ids } };

export const findDestinationApiKeyIds = async ({
  client,
  destinationIds,
  unitId = STREAMS_DEFAULT_UNIT_ID,
}: {
  client: ElasticsearchClient;
  destinationIds: string[];
  unitId?: string;
}): Promise<string[]> => {
  if (destinationIds.length === 0) {
    return [];
  }

  return queryManagedApiKeyIds({
    client,
    filter: [
      { term: { 'metadata.managed_by': STREAMS_DESTINATIONS_MANAGED_BY } },
      idTermsFilter('metadata.streams_destination_id', destinationIds),
      { term: { invalidated: false } },
      { term: { 'metadata.streams_unit_id': unitId } },
    ],
  });
};

export const findSourceApiKeyIds = async ({
  client,
  sourceIds,
  unitId = STREAMS_DEFAULT_UNIT_ID,
}: {
  client: ElasticsearchClient;
  sourceIds: string[];
  unitId?: string;
}): Promise<string[]> => {
  if (sourceIds.length === 0) {
    return [];
  }

  return queryManagedApiKeyIds({
    client,
    filter: [
      { term: { 'metadata.managed_by': STREAMS_SOURCES_MANAGED_BY } },
      idTermsFilter('metadata.source_id', sourceIds),
      { term: { invalidated: false } },
      { term: { 'metadata.streams_unit_id': unitId } },
    ],
  });
};

/**
 * Invalidates the API keys of removed sources and destinations, found by their key metadata.
 * Resolves to whether some of those keys may still be active.
 *
 * `client` must be scoped to the current user. The internal user (`kibana_system`) cannot find
 * these keys: they are created by end users, and its only query privilege is `manage_own_api_key`,
 * so Elasticsearch silently narrows its queries to keys it owns itself. A user with
 * `manage_api_key` finds every user's keys; one with only `manage_own_api_key` finds just their
 * own, so keys created by other users may survive.
 */
export const revokeComponentApiKeys = async ({
  client,
  logger,
  sourceIds,
  destinationIds,
  unitId = STREAMS_DEFAULT_UNIT_ID,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  sourceIds: string[];
  destinationIds: string[];
  unitId?: string;
}): Promise<{ apiKeysMayRemain: boolean }> => {
  try {
    const { cluster } = await client.security.hasPrivileges({
      cluster: [MANAGE_ALL_API_KEYS_PRIVILEGE, MANAGE_OWN_API_KEYS_PRIVILEGE],
    });
    const canManageAllApiKeys = cluster[MANAGE_ALL_API_KEYS_PRIVILEGE] === true;
    if (!canManageAllApiKeys && cluster[MANAGE_OWN_API_KEYS_PRIVILEGE] !== true) {
      return { apiKeysMayRemain: true };
    }

    const [destinationKeyIds, sourceKeyIds] = await Promise.all([
      findDestinationApiKeyIds({ client, destinationIds, unitId }),
      findSourceApiKeyIds({ client, sourceIds, unitId }),
    ]);
    const ids = [...destinationKeyIds, ...sourceKeyIds];
    if (ids.length === 0) {
      return { apiKeysMayRemain: !canManageAllApiKeys };
    }

    const { error_count: errorCount } = await client.security.invalidateApiKey({ ids });
    return { apiKeysMayRemain: !canManageAllApiKeys || errorCount > 0 };
  } catch (error) {
    logger.error(`Failed to invalidate Streams component API keys: ${error}`);
    return { apiKeysMayRemain: true };
  }
};
