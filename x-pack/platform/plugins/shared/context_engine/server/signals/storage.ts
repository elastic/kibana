/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { SignalEnvelope } from '../../common/http_api/signals';
import { SIGNAL_INDEX } from '../../common/http_api/signals';

export const storageSettings = {
  name: SIGNAL_INDEX,
  schema: {
    properties: {
      signal_id: types.keyword({}),
      '@timestamp': types.date({}),
      trace_ids: types.keyword({}),
      signal_type: types.keyword({}),
      // Classification labels. `nested` keeps each label's fields together;
      // group by tag type with a `nested` terms aggregation.
      tags: types.nested({
        properties: {
          type: types.keyword({}),
          sub_type: types.keyword({}),
          confidence: types.double({}),
        },
      }),
      // Per-type observation. `flattened` keeps every leaf term-filterable and
      // terms-aggregatable without mapping growth as signal types are added.
      // `ignore_above: 1024` skips indexing ANY leaf value longer than 1024 chars
      // (it still lives in `_source`) — this keeps long free-text like `query` /
      // `error` out of the index, but note it applies to every `data.*` leaf, so a
      // guaranteed-filterable long field should be promoted to a typed envelope field.
      data: types.flattened({ ignore_above: 1024 }),
    },
  },
} satisfies IndexStorageSettings;

export type SignalsStorageSettings = typeof storageSettings;

export type SignalsStorageClient = IStorageClient<SignalsStorageSettings, SignalEnvelope>;

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
