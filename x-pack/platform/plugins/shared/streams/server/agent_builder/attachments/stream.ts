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
import type { Streams } from '@kbn/streams-schema';
import {
  STREAMS_ATTACHMENT_TYPE_ID,
  STREAMS_SUGGEST_PARTITIONS_TOOL_ID,
  STREAMS_SUGGEST_PIPELINE_TOOL_ID,
  STREAMS_GET_PROCESSING_STEPS_TOOL_ID,
  STREAMS_SUGGEST_GROK_PATTERN_TOOL_ID,
  STREAMS_SUGGEST_DISSECT_PATTERN_TOOL_ID,
} from '../constants';

export const streamAttachmentDataSchema = z.object({
  streamName: z.string(),
  streamDefinition: z.record(z.any()).optional(),
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

          const { streamName, streamDefinition } = attachment.data;

          // Build comprehensive stream context
          const contextParts = [`Stream: ${streamName}`, ``];

          if (streamDefinition) {
            const def = streamDefinition as Streams.all.Definition;

            if (def.description) {
              contextParts.push(`Description: ${def.description}`);
              contextParts.push('');
            }

            // Add ingest-specific information if available
            if ('ingest' in def) {
              const ingestDef = def as Streams.ingest.all.Definition;

              // Processing information
              if (ingestDef.ingest.processing?.steps) {
                const steps = ingestDef.ingest.processing.steps;
                contextParts.push(`Processing Pipeline (${steps.length} step(s)):`);
                steps.forEach((step: any, idx: number) => {
                  const stepType = Object.keys(step)[0];
                  contextParts.push(`  ${idx + 1}. ${stepType}`);
                });
                contextParts.push('');
              }

              // Lifecycle information
              if (ingestDef.ingest.lifecycle) {
                contextParts.push(`Lifecycle: Configured`);
                contextParts.push('');
              }

              // Routing information
              if ('routing' in ingestDef && (ingestDef as any).routing) {
                const routing = (ingestDef as any).routing || [];
                if (routing.length > 0) {
                  contextParts.push(`Routing Rules (${routing.length} rule(s)):`);
                  routing.forEach((rule: any, idx: number) => {
                    contextParts.push(
                      `  ${idx + 1}. ${rule.destination || 'unknown'}: ${
                        rule.condition || 'no condition'
                      }`
                    );
                  });
                  contextParts.push('');
                }
              }

              // Field mappings
              if ('classic' in ingestDef.ingest && ingestDef.ingest.classic?.field_overrides) {
                const overrides = Object.keys(ingestDef.ingest.classic.field_overrides);
                if (overrides.length > 0) {
                  contextParts.push(`Field Overrides: ${overrides.length} field(s) customized`);
                  contextParts.push('');
                }
              }
            }
          }

          contextParts.push('Available Tools:');
          contextParts.push(
            '- streams.suggest_partitions: Generate AI-powered partition suggestions based on log clustering'
          );
          contextParts.push(
            '- streams.suggest_pipeline: Generate complete processing pipeline with parsing and enrichment'
          );
          contextParts.push(
            '- streams.get_processing_steps: View current processing pipeline configuration'
          );
          contextParts.push(
            '- streams.suggest_grok_pattern: Analyze sample logs and generate grok patterns for parsing'
          );
          contextParts.push(
            '- streams.suggest_dissect_pattern: Generate dissect patterns for structured log parsing'
          );

          const value = dedent(contextParts.join('\n'));

          return {
            type: 'text' as const,
            value,
          };
        },
      };
    },
    getTools: () => [
      STREAMS_SUGGEST_PARTITIONS_TOOL_ID,
      STREAMS_SUGGEST_PIPELINE_TOOL_ID,
      STREAMS_GET_PROCESSING_STEPS_TOOL_ID,
      STREAMS_SUGGEST_GROK_PATTERN_TOOL_ID,
      STREAMS_SUGGEST_DISSECT_PATTERN_TOOL_ID,
    ],
    getAgentDescription: () => {
      return dedent(`
        A Stream attachment provides context about an Elasticsearch data stream managed by the Streams plugin.
        
        The attachment includes comprehensive stream information such as name, description, lifecycle settings, 
        processing pipeline details, routing rules, and field mappings.
        
        Use the available tools to:
        - Analyze the stream and suggest partitions (streams.suggest_partitions)
        - Generate complete processing pipelines (streams.suggest_pipeline)
        - View and modify processing steps (streams.get_processing_steps)
        - Generate grok patterns for log parsing (streams.suggest_grok_pattern)
        - Generate dissect patterns for structured logs (streams.suggest_dissect_pattern)
        
        After generating suggestions or patterns, use the appropriate browser tools to display them in the UI for user review.
      `);
    },
  };
}
