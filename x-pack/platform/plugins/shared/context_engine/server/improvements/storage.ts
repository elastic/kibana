/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient, StorageSchema } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { Improvement } from '../../common/http_api/improvements';
import { IMPROVEMENTS_INDEX } from '../../common/http_api/improvements';

/**
 * Mapping for the global improvements index.
 *
 * `payload` and `resolution` are `object({ enabled: false })`: kept in `_source` but not indexed.
 * Proposed KI content and workflow YAML routinely run to several kilobytes, so `flattened` with
 * its `ignore_above` would silently drop them, and nothing queries inside the change anyway. The
 * queries that matter — "every suggestion touching workflow X" — are served by `target.*`, with
 * the exception of `target.source_value`, which is unbounded for the same reason.
 */
export const improvementsSchema = {
  properties: {
    improvement_id: types.keyword({}),
    revision_id: types.keyword({}),
    previous_revision_id: types.keyword({}),
    latest: types.boolean({}),
    ai_index_id: types.keyword({}),
    '@timestamp': types.date({}),
    status: types.keyword({}),
    suggested_at: types.date({}),
    applied_at: types.date({}),
    rejected_at: types.date({}),
    title: types.text({}),
    rationale: types.text({}),
    action: types.keyword({}),
    target: types.object({
      properties: {
        ki_id: types.keyword({}),
        workflow_id: types.keyword({}),
        // A source value is an ES|QL query or a connector reference, so it is unbounded where the
        // other discriminators are ids. Indexed as a keyword it would hit the adapter's default
        // `ignore_above: 1024` and silently stop being searchable past that length — the same
        // silent truncation that rules `flattened` out for `payload`. Nothing queries it either:
        // "which suggestions touch this source" is answered by `improvement_id`, which already
        // hashes the value. So it is kept in `_source` for display and left out of the index.
        source_value: types.keyword({ index: false, doc_values: false }),
        subject: types.keyword({}),
      },
    }),
    payload: types.object({ enabled: false }),
    resolution: types.object({ enabled: false }),
    provenance: types.object({
      properties: {
        agent_run_id: types.keyword({}),
        signal_ids: types.keyword({}),
        signal_spaces: types.keyword({}),
        signal_window: types.object({
          properties: { from: types.date({}), to: types.date({}) },
        }),
        signal_count: types.long({}),
        tags: types.keyword({}),
      },
    }),
  },
} satisfies StorageSchema;

const storageSettings = {
  name: IMPROVEMENTS_INDEX,
  schema: improvementsSchema,
} satisfies IndexStorageSettings;

export type ImprovementsStorageSettings = typeof storageSettings;

export type ImprovementsStorageClient = IStorageClient<ImprovementsStorageSettings, Improvement>;

/** Creates a storage client bound to the global improvements index. */
export const createImprovementsStorageClient = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): ImprovementsStorageClient => {
  const adapter = new StorageIndexAdapter<ImprovementsStorageSettings, Improvement>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};
