/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { SmlTypeDefinition } from '@kbn/agent-builder-plugin/server';
import type { Streams } from '@kbn/streams-schema';
import { createStreamsStorageClient } from '../../lib/streams/storage/streams_storage_client';
import {
  STREAM_SML_TYPE,
  STREAM_ATTACHMENT_TYPE,
  type StreamAttachmentData,
} from '../../../common/agent_builder/stream_attachment';
import { getStreamType } from './utils';

const PAGE_SIZE = 1000;

const hasSource = (hit: {
  _source?: Streams.all.Definition;
}): hit is { _source: Streams.all.Definition } => hit._source !== undefined;

export const createStreamSmlType = ({
  core,
  logger,
}: {
  core: CoreSetup;
  logger: Logger;
}): SmlTypeDefinition => ({
  id: STREAM_SML_TYPE,
  fetchFrequency: () => '30m',

  async *list(context) {
    const storageClient = createStreamsStorageClient(context.esClient, context.logger);

    let searchAfter: string[] | undefined;

    while (true) {
      const response = await storageClient.search({
        size: PAGE_SIZE,
        sort: [{ name: 'asc' }],
        track_total_hits: false,
        ...(searchAfter ? { search_after: searchAfter } : {}),
      });

      const hits = response.hits.hits
        .filter(hasSource)
        .filter(({ _source }) => !('group' in _source));

      if (hits.length === 0) {
        break;
      }

      yield hits.map(({ _source }) => ({
        id: _source.name,
        updatedAt: _source.updated_at ?? new Date().toISOString(),
        spaces: ['*'],
      }));

      const lastHit = response.hits.hits[response.hits.hits.length - 1];
      searchAfter = lastHit.sort as string[] | undefined;

      if (response.hits.hits.length < PAGE_SIZE) {
        break;
      }
    }
  },

  getSmlData: async (originId, context) => {
    try {
      const storageClient = createStreamsStorageClient(context.esClient, context.logger);
      const response = await storageClient.get({ id: originId });
      const definition = response._source;

      if (!definition) {
        return undefined;
      }

      const streamType = getStreamType(definition);
      const contentParts = [definition.name, definition.description, `type: ${streamType}`].filter(
        Boolean
      );

      return {
        chunks: [
          {
            type: STREAM_SML_TYPE,
            title: definition.name,
            content: contentParts.join('\n'),
            permissions: ['api:read_stream'],
          },
        ],
      };
    } catch (error) {
      context.logger.warn(
        `SML stream: failed to get data for '${originId}': ${(error as Error).message}`
      );
      return undefined;
    }
  },

  toAttachment: async (item) => {
    try {
      const [coreStart] = await core.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const storageClient = createStreamsStorageClient(esClient, logger);
      const response = await storageClient.get({ id: item.origin_id });
      const definition = response._source;

      if (!definition) {
        return undefined;
      }

      const data: StreamAttachmentData = {
        stream_name: definition.name,
        stream_type: getStreamType(definition),
        description: definition.description || '',
      };

      return {
        type: STREAM_ATTACHMENT_TYPE,
        data,
        origin: item.origin_id,
        description: definition.name,
      };
    } catch (error) {
      logger.warn(
        `SML stream: failed to convert '${item.origin_id}' to attachment: ${
          (error as Error).message
        }`
      );
      return undefined;
    }
  },
});
