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
import type { Streams } from '@kbn/streams-schema';
import type { StreamsPluginStartDependencies } from '../../types';
import { STREAMS_GET_PROCESSING_STEPS_TOOL_ID } from '../constants';

const STREAMS_INDEX = '.kibana_streams';

const getProcessingStepsSchema = z.object({
  streamName: z.string().describe('Name of the stream to get processing steps for'),
});

type GetProcessingStepsParams = z.infer<typeof getProcessingStepsSchema>;

export function createGetProcessingStepsTool({
  core,
  logger,
}: {
  core: CoreSetup<StreamsPluginStartDependencies>;
  logger: Logger;
}): BuiltinToolDefinition<typeof getProcessingStepsSchema> {
  return {
    id: STREAMS_GET_PROCESSING_STEPS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves the current processing pipeline configuration for a stream. 

Returns:
- List of processors in execution order
- Each processor's type and configuration
- Field mappings and transformations
- Last update timestamp

Use this when you need to:
- Understand how data is currently being processed
- Identify what fields are being extracted or transformed
- Determine if grok/dissect patterns are already configured
- Plan modifications to the processing pipeline`,
    tags: ['streams', 'processing', 'pipeline', 'enrichment'],
    schema: getProcessingStepsSchema,
    handler: async ({ streamName }: GetProcessingStepsParams, context) => {
      const toolLogger = logger.get('get_processing_steps');

      try {
        const [coreStart] = await core.getStartServices();
        const scopedClusterClient = coreStart.elasticsearch.client.asScoped(context.request);

        // Fetch the stream definition
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
        if (!('ingest' in streamDefinition)) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Stream "${streamName}" is not an ingest stream. Processing steps are only available for ingest streams.`,
                },
              },
            ],
          };
        }

        const ingestDef = streamDefinition as Streams.ingest.all.Definition;
        const processing = ingestDef.ingest.processing;

        const processingInfo = {
          streamName,
          steps: processing.steps || [],
          updated_at: processing.updated_at,
          step_count: processing.steps?.length || 0,
          step_types: [...new Set((processing.steps || []).map((p: any) => Object.keys(p)[0]))],
        };

        toolLogger.debug(
          `Retrieved ${processingInfo.step_count} processing steps for stream "${streamName}"`
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              data: processingInfo,
            },
          ],
        };
      } catch (error) {
        toolLogger.error(
          `Error getting processing steps for stream "${streamName}": ${error.message}`
        );
        toolLogger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to retrieve processing steps: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
