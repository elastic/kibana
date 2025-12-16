/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { partitionStream } from '@kbn/streams-ai';
import { Streams } from '@kbn/streams-schema';
import type { StreamsPluginStartDependencies } from '../../types';
import { STREAMS_SUGGEST_PARTITIONS_TOOL_ID } from '../constants';

const STREAMS_INDEX = '.kibana_streams';

const suggestPartitionsSchema = z.object({
  streamName: z.string().describe('Name of the stream to analyze for partitioning suggestions'),
  startTime: z
    .string()
    .optional()
    .describe(
      'Start of the time range to analyze (e.g., "now-1h", "2024-01-01T00:00:00Z"). Defaults to "now-1h"'
    ),
  endTime: z
    .string()
    .optional()
    .describe(
      'End of the time range to analyze (e.g., "now", "2024-01-01T23:59:59Z"). Defaults to "now"'
    ),
  guidance: z
    .string()
    .optional()
    .describe(
      'Optional guidance to influence the partitioning suggestions. Use this to provide context about what kind of partitions the user wants, specific systems to look for, or any other hints to guide the AI.'
    ),
});

type SuggestPartitionsParams = z.infer<typeof suggestPartitionsSchema>;

/**
 * Parse a time string to a timestamp.
 * Supports formats like "now", "now-1h", or ISO strings.
 */
function parseTimeToTimestamp(timeStr: string): number {
  if (timeStr === 'now') {
    return Date.now();
  }

  // Handle relative time like "now-1h", "now-24h", etc.
  const relativeMatch = timeStr.match(/^now-(\d+)([smhd])$/);
  if (relativeMatch) {
    const [, amount, unit] = relativeMatch;
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return Date.now() - parseInt(amount, 10) * multipliers[unit];
  }

  // Try parsing as ISO date string
  const timestamp = Date.parse(timeStr);
  if (!isNaN(timestamp)) {
    return timestamp;
  }

  throw new Error(`Invalid time format: ${timeStr}`);
}

export function createSuggestPartitionsTool({
  core,
  logger,
}: {
  core: CoreSetup<StreamsPluginStartDependencies>;
  logger: Logger;
}): BuiltinToolDefinition<typeof suggestPartitionsSchema> {
  return {
    id: STREAMS_SUGGEST_PARTITIONS_TOOL_ID,
    type: ToolType.builtin,
    description: `Analyzes a stream's data and suggests optimal partitions based on log clustering. 
Use this tool when the user wants to:
- Split a stream into logical partitions
- Organize their data by system or service
- Get AI-powered suggestions for routing rules

You can provide optional guidance to influence the suggestions. For example:
- "Focus on separating by service name"
- "Look for different database systems"  
- "I want to partition by environment (prod, staging, dev)"

The tool returns a list of suggested partitions, each with a name and condition that can be used for routing.
After getting suggestions, use the streams_set_partition_suggestions browser tool to display them in the UI for user review.`,
    tags: ['streams', 'partitioning', 'routing'],
    schema: suggestPartitionsSchema,
    handler: async (
      { streamName, startTime = 'now-1h', endTime = 'now', guidance }: SuggestPartitionsParams,
      context
    ) => {
      const toolLogger = logger.get('suggest_partitions');

      try {
        context.events.reportProgress('Fetching stream definition...');

        const [coreStart, pluginsStart] = await core.getStartServices();
        const scopedClusterClient = coreStart.elasticsearch.client.asScoped(context.request);
        const inferenceClient = pluginsStart.inference.getClient({ request: context.request });

        // Fetch the stream definition from the streams storage index
        const searchResult = await scopedClusterClient.asCurrentUser.search<Streams.all.Definition>(
          {
            index: STREAMS_INDEX,
            query: {
              term: {
                _id: streamName,
              },
            },
            size: 1,
          }
        );

        if (searchResult.hits.hits.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Stream "${streamName}" not found. Please verify the stream name and try again.`,
                },
              },
            ],
          };
        }

        const streamDefinition = searchResult.hits.hits[0]._source;

        if (!streamDefinition) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Stream "${streamName}" has no definition data.`,
                },
              },
            ],
          };
        }

        // Verify it's an ingest stream
        if (!Streams.ingest.all.Definition.is(streamDefinition)) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Stream "${streamName}" is not a valid ingest stream. Partitioning is only supported for ingest streams.`,
                },
              },
            ],
          };
        }

        context.events.reportProgress('Analyzing stream data for partition suggestions...');

        // Parse time range
        const start = parseTimeToTimestamp(startTime);
        const end = parseTimeToTimestamp(endTime);

        // Get the default model for inference
        // The inferenceClient from getDefaultModel() is already a BoundInferenceClient
        const defaultModel = await context.modelProvider.getDefaultModel();

        toolLogger.debug(
          `Using connector "${defaultModel.connector.name}" (${defaultModel.connector.connectorId}) for partition suggestions`
        );

        if (guidance) {
          toolLogger.debug(`Partition guidance provided: ${guidance}`);
        }

        // Use the partitionStream function from @kbn/streams-ai
        const partitions = await partitionStream({
          definition: streamDefinition,
          inferenceClient: defaultModel.inferenceClient,
          esClient: scopedClusterClient.asCurrentUser,
          logger: toolLogger,
          start,
          end,
          maxSteps: 1,
          signal: context.request.events.aborted,
          guidance,
        });

        if (partitions.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  streamName,
                  partitions: [],
                  message:
                    'No partition suggestions found. This could mean the stream data is too homogeneous or there are no clear system boundaries.',
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                streamName,
                partitions: partitions.map(({ name, condition }) => ({
                  name,
                  condition,
                })),
                message: `Found ${partitions.length} suggested partition(s) for stream "${streamName}". Use the streams_set_partition_suggestions tool to display these in the UI for the user to review.`,
              },
            },
          ],
        };
      } catch (error) {
        toolLogger.error(
          `Error suggesting partitions for stream "${streamName}": ${error.message}`
        );
        toolLogger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate partition suggestions: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
