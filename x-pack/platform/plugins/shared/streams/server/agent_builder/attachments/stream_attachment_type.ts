/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createStreamsStorageClient } from '../../lib/streams/storage/streams_storage_client';
import {
  STREAM_ATTACHMENT_TYPE,
  type StreamAttachmentData,
} from '../../../common/agent_builder/stream_attachment';
import { STREAMS_TOOL_IDS } from '../tools/tool_ids';
import { getStreamType } from '../sml/utils';

const streamAttachmentDataSchema = z.object({
  stream_name: z.string(),
  stream_type: z.enum(['wired', 'classic', 'query', 'unknown']),
  description: z.string(),
});

export const createStreamAttachmentType = ({
  core,
  logger,
}: {
  core: CoreSetup;
  logger: Logger;
}): AttachmentTypeDefinition<typeof STREAM_ATTACHMENT_TYPE, StreamAttachmentData> => ({
  id: STREAM_ATTACHMENT_TYPE,

  isReadonly: true,

  validate: (input) => {
    const result = streamAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  format: (attachment) => {
    const { stream_name: name, stream_type: streamType, description } = attachment.data;

    return {
      getRepresentation: () => {
        const parts: string[] = [`Stream: ${name}`, `Type: ${streamType}`];
        if (description) {
          parts.push(`Description: ${description}`);
        }
        parts.push(
          '',
          'Use the streams tools (list_streams, get_stream, get_schema, query_documents, etc.) to inspect and query this stream.'
        );
        return { type: 'text' as const, value: parts.join('\n') };
      },
    };
  },

  resolve: async (origin) => {
    try {
      const [coreStart] = await core.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const storageClient = createStreamsStorageClient(esClient, logger);
      const response = await storageClient.get({ id: origin });
      const definition = response._source;

      if (!definition) {
        return undefined;
      }

      return {
        stream_name: definition.name,
        stream_type: getStreamType(definition),
        description: definition.description || '',
      };
    } catch (error) {
      logger.warn(`Stream attachment: failed to resolve '${origin}': ${(error as Error).message}`);
      return undefined;
    }
  },

  getTools: () => [...STREAMS_TOOL_IDS],

  getAgentDescription: () =>
    'A stream attachment represents an Elasticsearch data stream. ' +
    'Use the streams tools to list, inspect, query, and analyze the attached stream.',
});
