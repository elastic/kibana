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
import { buildSignalsIndexName } from '../../common/http_api/signals';

/** Shared mapping for every per-space signals index. */
export const signalsSchema = {
  properties: {
    signal_id: types.keyword({}),
    '@timestamp': types.date({}),
    trace_ids: types.keyword({}),
    signal_type: types.keyword({}),
    tags: types.keyword({}),
    data: types.flattened({ ignore_above: 1024 }),
  },
} satisfies StorageSchema;

const buildStorageSettings = (spaceId: string) =>
  ({ name: buildSignalsIndexName(spaceId), schema: signalsSchema } satisfies IndexStorageSettings);

export type SignalsStorageSettings = ReturnType<typeof buildStorageSettings>;

export type SignalsStorageClient = IStorageClient<SignalsStorageSettings, SignalEnvelope>;

/** Creates a storage client bound to a single space's signals index. */
export const createSignalsStorageClient = ({
  esClient,
  logger,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}): SignalsStorageClient => {
  const adapter = new StorageIndexAdapter<SignalsStorageSettings, SignalEnvelope>(
    esClient,
    logger,
    buildStorageSettings(spaceId)
  );
  return adapter.getClient();
};
