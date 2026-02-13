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
import { generateStreamDescription } from '@kbn/streams-ai';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';

export const STREAMS_GENERATE_DESCRIPTION_TOOL_ID = 'streams.generate_description';

const generateDescriptionSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to generate a description for'),
  startMs: z
    .number()
    .optional()
    .describe('Start of the time range to analyze, as Unix timestamp in milliseconds. Defaults to 24 hours ago.'),
  endMs: z
    .number()
    .optional()
    .describe('End of the time range to analyze, as Unix timestamp in milliseconds. Defaults to now.'),
});

export function createGenerateDescriptionTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof generateDescriptionSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof generateDescriptionSchema> = {
    id: STREAMS_GENERATE_DESCRIPTION_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Uses AI to generate a human-readable description for a stream based on sample data. Analyzes document patterns to produce a meaningful description. This may take some time as it involves LLM reasoning.',
    tags: ['streams', 'ai'],
    schema: generateDescriptionSchema,
    handler: async (toolParams, context) => {
      const { name, startMs, endMs } = toolParams;
      const { request, modelProvider, logger } = context;
      try {
        const { streamsClient, inferenceClient, scopedClusterClient } =
          await getScopedStreamsClients({ core, request });

        const { connector } = await modelProvider.getDefaultModel();
        const resolvedConnectorId = connector.connectorId;

        const now = Date.now();
        const resolvedEndMs = endMs ?? now;
        const resolvedStartMs = startMs ?? resolvedEndMs - 24 * 60 * 60 * 1000;

        const stream = await streamsClient.getStream(name);
        const abortController = new AbortController();

        const result = await generateStreamDescription({
          stream,
          start: resolvedStartMs,
          end: resolvedEndMs,
          esClient: scopedClusterClient.asCurrentUser,
          inferenceClient: inferenceClient.bindTo({ connectorId: resolvedConnectorId }),
          signal: abortController.signal,
          logger,
          systemPrompt: '',
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Generated description for stream "${name}"`,
                stream: name,
                description: result.description,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.generate_description tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate description for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
