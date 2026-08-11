/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import {
  StorageIndexAdapter,
  type IStorageClient,
  types,
  type IndexStorageSettings,
} from '@kbn/storage-adapter';

const streamsSettingsStorageSettings = {
  name: '.kibana_streams_settings',
  schema: {
    properties: {
      wired_streams_disabled_by_user: types.boolean(),
    },
  },
} satisfies IndexStorageSettings;

interface StreamsSettings {
  wired_streams_disabled_by_user: boolean;
}

type StreamsSettingsStorageSettings = typeof streamsSettingsStorageSettings;
export type StreamsSettingsStorageClient = IStorageClient<
  StreamsSettingsStorageSettings,
  StreamsSettings
>;

export function createStreamsSettingsStorageClient(
  esClient: ElasticsearchClient,
  logger: Logger
): StreamsSettingsStorageClient {
  const adapter = new StorageIndexAdapter<StreamsSettingsStorageSettings, StreamsSettings>(
    esClient,
    logger,
    streamsSettingsStorageSettings
  );
  return adapter.getClient();
}
