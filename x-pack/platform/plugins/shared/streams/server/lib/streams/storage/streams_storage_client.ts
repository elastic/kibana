/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  StorageIndexAdapter,
  type IStorageClient,
  type StorageSettings,
  types,
} from '@kbn/storage-adapter';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Streams } from '@kbn/streams-schema';
import { migrateOnRead } from './migrate_on_read';

const streamsStorageSettings = {
  name: '.kibana_streams',
  schema: {
    properties: {
      name: types.keyword(),
      description: types.text(),
      updated_at: types.date(),
      ingest: types.object({ enabled: false }),
      query: types.object({ enabled: false }),
      query_streams: types.object({ enabled: false }),
    },
  },
} satisfies StorageSettings;

type StreamsStorageSettings = typeof streamsStorageSettings;
export type StreamsStorageClient = IStorageClient<StreamsStorageSettings, Streams.all.Definition>;

/**
 * This ensures there's only one way to initialize a storage client for streams, with the proper
 * settings and migration on read.
 * @param esClient
 * @param logger
 */
export function createStreamsStorageClient(
  esClient: ElasticsearchClient,
  logger: Logger
): StreamsStorageClient {
  const adapter = new StorageIndexAdapter<StreamsStorageSettings, Streams.all.Definition>(
    esClient,
    logger,
    streamsStorageSettings,
    {
      migrateSource: migrateOnRead,
    }
  );

  return adapter.getClient();
}
