/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/core/server';

import {
  Connector,
  CONNECTORS_JOBS_INDEX,
  ConnectorSyncJobDocument,
  ElasticsearchIndexWithIngestion,
  fetchConnectorByIndexName,
  SyncStatus,
} from '@kbn/search-connectors';

import { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { isNotNullish } from '@kbn/search-connectors';
import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../common/constants';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';
import { isClosed, isHidden } from '../../utils/index_utils';

const hasInProgressSyncs = async (
  client: ElasticsearchClient,
  connectorId: string
): Promise<{ inProgress: boolean; pending: boolean }> => {
  try {
    const syncs = await client.search<ConnectorSyncJobDocument>({
      index: CONNECTORS_JOBS_INDEX,
      query: {
        bool: {
          filter: [
            { term: { 'connector.id': connectorId } },
            {
              dis_max: {
                queries: [
                  { term: { status: SyncStatus.IN_PROGRESS } },
                  { term: { status: SyncStatus.PENDING } },
                ],
              },
            },
          ],
        },
      },
    });
    const inProgress = syncs.hits.hits.some(
      (sync) => sync._source?.status === SyncStatus.IN_PROGRESS
    );
    const pending = syncs.hits.hits.some((sync) => sync._source?.status === SyncStatus.PENDING);
    return { inProgress, pending };
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return { inProgress: false, pending: false };
    }
    throw error;
  }
};

export const fetchIndex = async (
  client: ElasticsearchClient,
  index: string,
  logger: Logger
): Promise<ElasticsearchIndexWithIngestion> => {
  const indexDataResult = await client.indices.get({ index });
  const indexData = indexDataResult[index];
  const indexPattern = '*';
  const indexMatches = await client.indices.get({
    expand_wildcards: ['open'],
    // for better performance only compute settings of indices but not mappings
    features: ['aliases', 'settings'],
    index: indexPattern,
  });
  const indexNames = Object.keys(indexMatches).filter(
    (indexName) =>
      indexMatches[indexName] &&
      !isHidden(indexMatches[indexName]) &&
      !isClosed(indexMatches[indexName])
  );

  const { count } = await client.count({ index });

  const indexNameSlice = indexNames.slice(0, 0 + 50).filter(isNotNullish);
  const indexCounts = await fetchIndexCounts(client, indexNameSlice);

  if (!indexData) {
    throw new Error('404');
  }
  // const indexStats = indices[index];
  let connector: Connector | undefined;
  try {
    connector = await fetchConnectorByIndexName(client, index);
  } catch (error) {
    logger.error(`Error fetching connector for index ${index}: ${error}`);
  }
  const hasInProgressSyncsResult = connector
    ? await hasInProgressSyncs(client, connector.id)
    : { inProgress: false, pending: false };

  const indexResult = {
    count,
    has_in_progress_syncs: hasInProgressSyncsResult.inProgress,
    has_pending_syncs: hasInProgressSyncsResult.pending,
  };

  if (connector && connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE) {
    return {
      ...indexResult,
      hidden: indexNames.length === 0,
      name: 'indexRe',
      total: {
        docs: {
          count: 0,
          deleted: 0,
        },
        store: {
          size_in_bytes: '',
        },
      },
      connector,
    };
  }

  return {
    ...indexResult,
    hidden: indexNames.length === 0,
    name: 'indexRe',
    total: {
      docs: {
        count: 0,
        deleted: 0,
      },
      store: {
        size_in_bytes: '',
      },
    },
    connector,
  };
};

export async function fetchIndices(
  client: ElasticsearchClient,
  from: number,
  size: number,
  searchQuery?: string
) {
  const indexPattern = searchQuery ? `*${searchQuery}*` : '*';
  const indexMatches = await client.indices.get({
    expand_wildcards: ['open'],
    // for better performance only compute settings of indices but not mappings
    features: ['aliases', 'settings'],
    index: indexPattern,
  });
  const indexNames = Object.keys(indexMatches).filter(
    (indexName) =>
      indexMatches[indexName] &&
      !isHidden(indexMatches[indexName]) &&
      !isClosed(indexMatches[indexName])
  );
  const indexNameSlice = indexNames.slice(from, from + size).filter(isNotNullish);
  if (indexNameSlice.length === 0) {
    return [];
  }
  const indexCounts = await fetchIndexCounts(client, indexNameSlice);
  return indexNameSlice.map((name) => ({
    name,
    count: indexCounts[name]?.total?.docs?.count ?? 0,
  }));
}

const fetchIndexCounts = async (
  client: ElasticsearchClient,
  indicesNames: string[]
): Promise<Record<string, IndicesStatsIndicesStats | undefined>> => {
  if (indicesNames.length === 0) {
    return {};
  }
  const indexCounts: Record<string, IndicesStatsIndicesStats | undefined> = {};
  // batch calls in batches of 100 to prevent loading too much onto ES
  for (let i = 0; i < indicesNames.length; i += 100) {
    const stats = await client.indices.stats({
      index: indicesNames.slice(i, i + 100),
      metric: ['docs'],
    });
    Object.assign(indexCounts, stats.indices);
  }
  return indexCounts;
};
