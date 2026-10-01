/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { KI_VIEW_NAME_PREFIX } from '../../common/constants';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { buildAiIndexSpaceWhere } from '../../common/space_filter';
import { formatErrorMessage } from '../utils/format_es_error';

/**
 * Elastic-managed dests carry per-document space privileges, so each space gets its own view with
 * the space filter in the body. User dests are scoped by the AI index object and share one view.
 */
const kiViewName = (aiIndexId: string, spaceId?: string): string =>
  `${KI_VIEW_NAME_PREFIX}${aiIndexId}${spaceId === undefined ? '' : `-${spaceId}`}`;

const LIFECYCLE_FILTERS = [
  'WHERE governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active"',
  'WHERE expires_at IS NULL OR expires_at > NOW()',
  'DROP governance.*',
];

const LATEST_REVISION = [
  'EVAL id = COALESCE(id, _id)',
  'INLINE STATS latest = MAX(@timestamp) BY id',
  'WHERE @timestamp == latest',
  'INLINE STATS latest_doc = MAX(_id) BY id',
  'WHERE _id == latest_doc',
  'DROP latest, latest_doc',
];

/**
 * The retrieval view of an AI index: the current, active, unexpired KIs without governance fields,
 * narrowed to `spaceId` for a managed dest.
 */
const kiViewQuery = ({ type, value }: AiIndexDest, spaceId?: string): string =>
  [
    `FROM ${value} METADATA _id, _index, _score`,
    ...(type === 'data_stream' ? LATEST_REVISION : []),
    ...LIFECYCLE_FILTERS,
    ...(spaceId === undefined ? [] : [buildAiIndexSpaceWhere(spaceId)]),
  ].join('\n| ');

/** Creates or replaces the view for an AI index; pass `spaceId` for a managed dest. */
export const putKiView = async ({
  esClient,
  aiIndexId,
  dest,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  spaceId?: string;
}): Promise<void> => {
  await esClient.esql.putView({
    name: kiViewName(aiIndexId, spaceId),
    query: kiViewQuery(dest, spaceId),
  });
};

/** Best-effort view delete. Returns an error string on failure, null on success or 404. */
export const deleteKiView = async ({
  esClient,
  logger,
  aiIndexId,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  aiIndexId: string;
  spaceId?: string;
}): Promise<string | null> => {
  const name = kiViewName(aiIndexId, spaceId);
  try {
    await esClient.esql.deleteView({ name }, { ignore: [404] });
    return null;
  } catch (error) {
    const message = formatErrorMessage(error);
    logger.warn(
      `Deleted AI index '${aiIndexId}', but failed to delete its view '${name}': ${message}`
    );
    return `Failed to delete the view '${name}': ${message}`;
  }
};
