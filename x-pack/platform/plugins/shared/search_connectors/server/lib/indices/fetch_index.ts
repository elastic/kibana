/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/core/server';

import {
  CONNECTORS_JOBS_INDEX,
  ConnectorSyncJobDocument,
  fetchConnectorByIndexName,
  FetchIndexResult,
  SyncStatus,
} from '@kbn/search-connectors';

import { isIndexNotFoundException } from '../../utils/identify_exceptions';

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
): Promise<FetchIndexResult | undefined> => {
  const [indexDataResult, indexCountResult, connectorResult] = await Promise.allSettled([
    client.indices.get({ index }),
    client.count({ index }),
    fetchConnectorByIndexName(client, index),
  ]);

  if (indexDataResult.status === 'rejected') {
    throw indexDataResult.reason;
  }
  const indexData = indexDataResult.value;
  if (!indexData || !indexData[index]) return undefined;

  const indexRes = indexData[index];
  const count = indexCountResult.status === 'fulfilled' ? indexCountResult.value.count : 0;
  const connector = connectorResult.status === 'fulfilled' ? connectorResult.value : undefined;

  return {
    index: {
      ...indexRes,
      count,
      connector,
    },
  };
};
