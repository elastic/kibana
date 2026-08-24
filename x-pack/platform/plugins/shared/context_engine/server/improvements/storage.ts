/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient, StorageSchema } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { ImprovementEnvelope } from '../../common/http_api/improvements';
import { buildImprovementsIndexName } from '../../common/http_api/improvements';

/**
 * Shared mapping for every per-space improvements index. `payload` and `resolution` hold
 * agent-authored KI documents and workflow YAML of arbitrary shape and size, and nothing queries
 * inside them, so they are stored in `_source` without being indexed.
 */
export const improvementsSchema = {
  properties: {
    improvement_id: types.keyword({}),
    ai_index_id: types.keyword({}),
    status: types.keyword({}),
    action: types.keyword({}),
    title: types.text({}),
    rationale: types.text({}),
    signal_tags: types.keyword({}),
    signal_ids: types.keyword({}),
    target: types.object({
      properties: { ki_id: types.keyword({}), workflow_id: types.keyword({}) },
    }),
    payload: types.object({ enabled: false }),
    confidence: types.float({}),
    run_id: types.keyword({}),
    suggested_at: types.date({}),
    applied_at: types.date({}),
    rejected_at: types.date({}),
    resolution: types.object({ enabled: false }),
  },
} satisfies StorageSchema;

const buildStorageSettings = (spaceId: string) =>
  ({
    name: buildImprovementsIndexName(spaceId),
    schema: improvementsSchema,
  } satisfies IndexStorageSettings);

export type ImprovementsStorageSettings = ReturnType<typeof buildStorageSettings>;

export type ImprovementsStorageClient = IStorageClient<
  ImprovementsStorageSettings,
  ImprovementEnvelope
>;

/** Creates a storage client bound to a single space's improvements index. */
export const createImprovementsStorageClient = ({
  esClient,
  logger,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}): ImprovementsStorageClient => {
  const adapter = new StorageIndexAdapter<ImprovementsStorageSettings, ImprovementEnvelope>(
    esClient,
    logger,
    buildStorageSettings(spaceId)
  );
  return adapter.getClient();
};
