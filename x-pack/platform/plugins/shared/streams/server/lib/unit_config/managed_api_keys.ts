/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
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

const componentFilter = ({
  managedBy,
  metadataField,
  componentId,
}: {
  managedBy: string;
  metadataField: string;
  componentId: string;
}): QueryDslQueryContainer[] => [
  { term: { 'metadata.managed_by': managedBy } },
  { term: { [`metadata.${metadataField}`]: componentId } },
  { term: { invalidated: false } },
];

export const findDestinationApiKeyIds = async ({
  client,
  destinationId,
}: {
  client: ElasticsearchClient;
  destinationId: string;
}): Promise<string[]> =>
  queryManagedApiKeyIds({
    client,
    filter: componentFilter({
      managedBy: STREAMS_DESTINATIONS_MANAGED_BY,
      metadataField: 'streams_destination_id',
      componentId: destinationId,
    }),
  });

export const findSourceApiKeyIds = async ({
  client,
  sourceId,
}: {
  client: ElasticsearchClient;
  sourceId: string;
}): Promise<string[]> =>
  queryManagedApiKeyIds({
    client,
    filter: componentFilter({
      managedBy: STREAMS_SOURCES_MANAGED_BY,
      metadataField: 'source_id',
      componentId: sourceId,
    }),
  });

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
}: {
  client: ElasticsearchClient;
  logger: Logger;
  sourceIds: string[];
  destinationIds: string[];
}): Promise<{ apiKeysMayRemain: boolean }> => {
  try {
    const { cluster } = await client.security.hasPrivileges({
      cluster: [MANAGE_ALL_API_KEYS_PRIVILEGE, MANAGE_OWN_API_KEYS_PRIVILEGE],
    });
    const canManageAllApiKeys = cluster[MANAGE_ALL_API_KEYS_PRIVILEGE] === true;
    if (!canManageAllApiKeys && cluster[MANAGE_OWN_API_KEYS_PRIVILEGE] !== true) {
      return { apiKeysMayRemain: true };
    }

    const keyIds = await Promise.all([
      ...destinationIds.map((destinationId) => findDestinationApiKeyIds({ client, destinationId })),
      ...sourceIds.map((sourceId) => findSourceApiKeyIds({ client, sourceId })),
    ]);
    const ids = keyIds.flat();
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
