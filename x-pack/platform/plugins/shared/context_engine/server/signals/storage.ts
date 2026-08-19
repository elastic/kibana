/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient, StorageSchema } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { SignalEnvelope } from '../../common/http_api/signals';
import { SIGNALS_INDEX_NAME } from '../../common/http_api/signals';

/** Schema for the global signals index (space isolation via `space_id` field). */
export const signalsSchema = {
  properties: {
    signal_id: types.keyword({}),
    '@timestamp': types.date({}),
    space_id: types.keyword({}),
    trace_ids: types.keyword({}),
    signal_type: types.keyword({}),
    tags: types.keyword({}),
    data: types.flattened({ ignore_above: 1024 }),
  },
} satisfies StorageSchema;

const storageSettings = {
  name: SIGNALS_INDEX_NAME,
  schema: signalsSchema,
} satisfies IndexStorageSettings;

export type SignalsStorageSettings = typeof storageSettings;

export type SignalsStorageClient = IStorageClient<SignalsStorageSettings, SignalEnvelope>;

/** Creates a storage client for the global signals index. */
export const createSignalsStorageClient = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): SignalsStorageClient => {
  const adapter = new StorageIndexAdapter<SignalsStorageSettings, SignalEnvelope>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};
