/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import dedent from 'dedent';
import type { Attachment } from '@kbn/onechat-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import { STREAMS_ATTACHMENT_TYPE_ID, STREAMS_SUGGEST_PARTITIONS_TOOL_ID } from '../constants';

export const streamAttachmentDataSchema = z.object({
  streamName: z.string(),
});

export type StreamAttachmentData = z.infer<typeof streamAttachmentDataSchema>;

/**
 * Type guard to ensure `attachment.data` conforms to StreamAttachmentData.
 */
const isValidStreamAttachmentData = (data: unknown): data is StreamAttachmentData => {
  return streamAttachmentDataSchema.safeParse(data).success;
};

/**
 * Creates the attachment type definition for streams.
 *
 * The stream attachment provides the stream name as context to the agent.
 * The agent can then use the streams.suggest_partitions tool to analyze
 * the stream and generate partition suggestions.
 */
export function createStreamAttachmentType(): AttachmentTypeDefinition<
  typeof STREAMS_ATTACHMENT_TYPE_ID,
  StreamAttachmentData
> {
  return {
    id: STREAMS_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsed = streamAttachmentDataSchema.safeParse(input);

      if (!parsed.success) {
        return { valid: false, error: parsed.error.message };
      }

      return { valid: true, data: parsed.data };
    },
    format: (attachment: Attachment<string, unknown>) => {
      return {
        getRepresentation: () => {
          // Re-validate attachment data
          if (!isValidStreamAttachmentData(attachment.data)) {
            throw new Error(`Invalid stream attachment data for attachment ${attachment.id}`);
          }

          const { streamName } = attachment.data;

          // Provide the stream name as context
          // The agent can use the suggest_partitions tool to get full details and suggestions
          const value = dedent(`
            Stream Context:
            - Stream Name: ${streamName}
            
            This is a Streams data stream. You can use the streams.suggest_partitions tool to:
            1. Analyze the stream's data
            2. Generate AI-powered partition suggestions based on log clustering
            3. Help the user organize their data into logical partitions
            
            When the user asks about partitioning this stream, use the suggest_partitions tool with streamName: "${streamName}"
          `);

          return {
            type: 'text' as const,
            value,
          };
        },
      };
    },
    getTools: () => [STREAMS_SUGGEST_PARTITIONS_TOOL_ID],
    getAgentDescription: () => {
      return dedent(`
        A Stream attachment provides context about an Elasticsearch data stream managed by the Streams plugin.
        Use the streams.suggest_partitions tool to analyze the stream and generate AI-powered partition suggestions.
        After generating suggestions, use the streams_set_partition_suggestions browser tool to display them in the UI.
      `);
    },
  };
}
