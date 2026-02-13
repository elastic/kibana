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
import { identifyFeatures } from '@kbn/streams-ai';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';

export const STREAMS_IDENTIFY_FEATURES_TOOL_ID = 'streams.identify_features';

const SAMPLE_DOC_COUNT = 50;

const identifyFeaturesSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to identify features for'),
  startMs: z
    .number()
    .optional()
    .describe('Start of the time range to analyze, as Unix timestamp in milliseconds. Defaults to 24 hours ago.'),
  endMs: z
    .number()
    .optional()
    .describe('End of the time range to analyze, as Unix timestamp in milliseconds. Defaults to now.'),
});

export function createIdentifyFeaturesTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof identifyFeaturesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof identifyFeaturesSchema> = {
    id: STREAMS_IDENTIFY_FEATURES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Uses AI to identify notable features in a stream\'s data. Analyzes sample documents to find patterns, anomalies, and interesting characteristics. This may take some time as it involves LLM reasoning.',
    tags: ['streams', 'ai'],
    schema: identifyFeaturesSchema,
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

        // Ensure stream exists
        await streamsClient.getStream(name);

        // Fetch sample documents from the stream
        const sampleResponse = await scopedClusterClient.asCurrentUser.search({
          index: name,
          size: SAMPLE_DOC_COUNT,
          query: {
            range: {
              '@timestamp': {
                gte: resolvedStartMs,
                lte: resolvedEndMs,
                format: 'epoch_millis',
              },
            },
          },
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        });

        const sampleDocuments = sampleResponse.hits.hits.map((hit) => hit._source as Record<string, unknown>);

        if (sampleDocuments.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `No documents found in stream "${name}" for the given time range. Cannot identify features without sample data.`,
                  stream: name,
                  features: [],
                },
              },
            ],
          };
        }

        const abortController = new AbortController();
        const result = await identifyFeatures({
          streamName: name,
          sampleDocuments,
          systemPrompt: '',
          inferenceClient: inferenceClient.bindTo({ connectorId: resolvedConnectorId }),
          logger,
          signal: abortController.signal,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Identified ${result.features.length} feature(s) in stream "${name}"`,
                stream: name,
                features: result.features,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.identify_features tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to identify features for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
