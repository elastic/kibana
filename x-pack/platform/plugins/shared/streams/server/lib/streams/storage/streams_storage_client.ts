/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
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
import { isRemovedStreamTypeDefinition } from './removed_stream_types';

const streamsStorageSettings = {
  name: '.kibana_streams',
  schema: {
    properties: {
      name: types.keyword(),
      type: types.keyword(),
      description: types.text(),
      updated_at: types.date(),
      ingest: types.object({ enabled: false }),
      query: types.object({ enabled: false }),
      query_streams: types.object({ enabled: false }),
      field_descriptions: types.object({ enabled: false }),
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

  const client = adapter.getClient();

  const search: StreamsStorageClient['search'] = async (request, transportOptions) => {
    const response = await client.search(request, transportOptions);
    return {
      ...response,
      hits: {
        ...response.hits,
        hits: response.hits.hits.filter(({ _source }) => !isRemovedStreamTypeDefinition(_source)),
      },
    };
  };

  const get: StreamsStorageClient['get'] = async (request, transportOptions) => {
    const response = await client.get(request, transportOptions);
    if (isRemovedStreamTypeDefinition(response._source)) {
      throw new errors.ResponseError({
        meta: {
          aborted: false,
          attempts: 1,
          connection: null,
          context: null,
          name: 'resource_not_found_exception',
          request: {} as unknown as DiagnosticResult['meta']['request'],
        },
        warnings: [],
        body: 'resource_not_found_exception',
        statusCode: 404,
      });
    }
    return response;
  };

  return { ...client, search, get };
}
