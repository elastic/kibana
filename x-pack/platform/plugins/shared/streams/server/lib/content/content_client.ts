/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ContentPackStream } from '@kbn/content-packs-schema';
import { IStorageClient, IndexStorageSettings, types } from '@kbn/storage-adapter';
import objectHash from 'object-hash';
import { CONTENT_NAME, STREAM_NAME } from './fields';

export const contentStorageSettings = {
  name: '.kibana_streams_content_pack_installations',
  schema: {
    properties: {
      [STREAM_NAME]: types.keyword(),
      [CONTENT_NAME]: types.keyword(),
      streams: types.object({ enabled: false }),
    },
  },
} satisfies IndexStorageSettings;

export type ContentStorageSettings = typeof contentStorageSettings;

export interface ContentPackInstallation {
  [STREAM_NAME]: string;
  [CONTENT_NAME]: string;
  streams: ContentPackStream[];
}

export class ContentClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<ContentStorageSettings, ContentPackInstallation>;
    }
  ) {}

  async getInstallations(streamName: string) {
    const response = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ term: { [STREAM_NAME]: streamName } }],
        },
      },
    });

    return response.hits.hits.map((hit) => hit._source);
  }

  async getInstallation(streamName: string, contentName: string) {
    const id = objectHash({ streamName, contentName });
    const response = await this.clients.storageClient.get({ id });
    return response._source!;
  }

  async upsertInstallation(
    streamName: string,
    content: {
      name: string;
      streams: ContentPackStream[];
    }
  ) {
    const id = objectHash({ streamName, contentName: content.name });
    await this.clients.storageClient.index({
      id,
      document: {
        [STREAM_NAME]: streamName,
        [CONTENT_NAME]: content.name,
        streams: content.streams,
      },
    });
  }
}
