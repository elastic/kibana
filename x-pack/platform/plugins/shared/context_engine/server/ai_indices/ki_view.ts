/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';

const kiViewName = (aiIndexId: string): string => `v-ai-index-${aiIndexId}`;

const LIFECYCLE_FILTERS = [
  'WHERE governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active"',
  'WHERE expires_at IS NULL OR expires_at > NOW()',
  'DROP governance.*',
];

/** The retrieval view of an AI index: the current, active, unexpired KIs without governance fields. */
const kiViewQuery = ({ type, value }: AiIndexDest): string =>
  (type === 'data_stream'
    ? [
        `FROM ${value} METADATA _id, _index, _score`,
        'EVAL id = COALESCE(id, _id)',
        'INLINE STATS latest = MAX(@timestamp) BY id',
        'WHERE @timestamp == latest',
        'INLINE STATS latest_doc = MAX(_id) BY id',
        'WHERE _id == latest_doc',
        'DROP latest, latest_doc',
        ...LIFECYCLE_FILTERS,
      ]
    : [`FROM ${value} METADATA _id, _index, _score`, ...LIFECYCLE_FILTERS]
  ).join('\n| ');

/** Creates or replaces the view for an AI index. */
export const putKiView = async ({
  esClient,
  aiIndexId,
  dest,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
}): Promise<void> => {
  await esClient.esql.putView({ name: kiViewName(aiIndexId), query: kiViewQuery(dest) });
};

/** Deletes the view for an AI index. A missing view is not an error. */
export const deleteKiView = async ({
  esClient,
  logger,
  aiIndexId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  aiIndexId: string;
}): Promise<void> => {
  const name = kiViewName(aiIndexId);
  try {
    await esClient.esql.deleteView({ name }, { ignore: [404] });
  } catch (error) {
    logger.warn(`Failed to delete ES|QL view '${name}' for AI index '${aiIndexId}': ${error}`);
  }
};
