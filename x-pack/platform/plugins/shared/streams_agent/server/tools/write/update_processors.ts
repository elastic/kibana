/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { Streams } from '@kbn/streams-schema';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';
import { buildIngestUpsertRequest } from './build_upsert_request';

export const STREAMS_UPDATE_PROCESSORS_TOOL_ID = 'streams.update_processors';

const processorStepSchema = z.object({
  action: z
    .enum(['grok', 'dissect', 'set', 'rename', 'remove', 'convert', 'date', 'drop', 'math', 'append', 'replace'])
    .describe('The processor type'),
  from: z.string().optional().describe('The source field (for grok, dissect, rename, convert, date, remove)'),
  patterns: z.array(z.string()).optional().describe('Grok patterns (for grok processor)'),
  pattern: z.string().optional().describe('Dissect pattern (for dissect processor)'),
  field: z.string().optional().describe('The target field (for set, rename, append)'),
  value: z.string().optional().describe('The value to set (for set, append, replace processors)'),
  target_type: z.string().optional().describe('Target type (for convert processor, e.g. "long", "double", "boolean")'),
  description: z.string().optional().describe('Human-readable description of what this processor does'),
  ignore_failure: z.boolean().optional().describe('Continue processing if this processor fails'),
});

const updateProcessorsSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to update processors for'),
  processors: z.array(processorStepSchema).describe('The full list of processors to set on the stream'),
});

export function createUpdateProcessorsTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof updateProcessorsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof updateProcessorsSchema> = {
    id: STREAMS_UPDATE_PROCESSORS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Updates the processing pipeline for a stream. Replaces the stream\'s processors with the provided list. Supported processor types: grok, dissect, set, rename, remove, convert, date, drop, math, append, replace. IMPORTANT: Always preview and get user confirmation before calling.',
    tags: ['streams'],
    schema: updateProcessorsSchema,
    handler: async (toolParams, context) => {
      const { name, processors } = toolParams;
      const { request, logger } = context;
      try {
        const { streamsClient } = await getScopedStreamsClients({ core, request });

        const stream = await streamsClient.getStream(name);
        if (!Streams.WiredStream.Definition.is(stream) && !Streams.ClassicStream.Definition.is(stream)) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: 'Processors can only be updated on ingest streams (wired or classic).' },
              },
            ],
          };
        }

        const upsertRequest = buildIngestUpsertRequest(stream, {
          processing: { steps: processors as StreamlangDSL['steps'] },
        });
        await streamsClient.upsertStream({ name, request: upsertRequest });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Successfully updated processors for stream "${name}"`,
                stream: name,
                processorCount: processors.length,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.update_processors tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to update processors for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
