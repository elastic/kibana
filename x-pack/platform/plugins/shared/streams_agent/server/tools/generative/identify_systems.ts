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
import { identifySystems } from '@kbn/streams-ai';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';

export const STREAMS_IDENTIFY_SYSTEMS_TOOL_ID = 'streams.identify_systems';

const identifySystemsSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to identify systems for'),
  startMs: z
    .number()
    .optional()
    .describe('Start of the time range to analyze, as Unix timestamp in milliseconds. Defaults to 24 hours ago.'),
  endMs: z
    .number()
    .optional()
    .describe('End of the time range to analyze, as Unix timestamp in milliseconds. Defaults to now.'),
});

export function createIdentifySystemsTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof identifySystemsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof identifySystemsSchema> = {
    id: STREAMS_IDENTIFY_SYSTEMS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Uses AI to identify the software systems and services sending data to a stream. Analyzes log patterns to determine which applications, infrastructure, and services are represented. This may take some time as it involves LLM reasoning.',
    tags: ['streams', 'ai'],
    schema: identifySystemsSchema,
    handler: async (toolParams, context) => {
      const { name, startMs, endMs } = toolParams;
      const { request, modelProvider, logger } = context;
      try {
        const { streamsClient, inferenceClient, scopedClusterClient, systemClient } =
          await getScopedStreamsClients({ core, request });

        const { connector } = await modelProvider.getDefaultModel();
        const resolvedConnectorId = connector.connectorId;

        const now = Date.now();
        const resolvedEndMs = endMs ?? now;
        const resolvedStartMs = startMs ?? resolvedEndMs - 24 * 60 * 60 * 1000;

        const stream = await streamsClient.getStream(name);

        // Get existing systems for the stream
        const { systems: existingSystems } = await systemClient.getSystems(name);

        const abortController = new AbortController();
        const result = await identifySystems({
          stream,
          systems: existingSystems,
          start: resolvedStartMs,
          end: resolvedEndMs,
          esClient: scopedClusterClient.asCurrentUser,
          inferenceClient: inferenceClient.bindTo({ connectorId: resolvedConnectorId }),
          logger,
          signal: abortController.signal,
          maxSteps: 3,
          dropUnmapped: false,
          descriptionPrompt: '',
          systemsPrompt: '',
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Identified ${result.systems.length} system(s) in stream "${name}"`,
                stream: name,
                systems: result.systems,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.identify_systems tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to identify systems for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
