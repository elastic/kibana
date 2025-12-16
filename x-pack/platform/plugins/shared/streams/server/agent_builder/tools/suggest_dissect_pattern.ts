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
import { Streams } from '@kbn/streams-schema';
import {
  extractDissectPattern,
  getReviewFields,
  ReviewDissectFieldsPrompt,
} from '@kbn/dissect-heuristics';
import type { StreamsPluginStartDependencies } from '../../types';
import { STREAMS_SUGGEST_DISSECT_PATTERN_TOOL_ID } from '../constants';
import {
  determineOtelFieldNameUsage,
  callInferenceWithPrompt,
  fetchFieldMetadata,
  normalizeFieldName,
} from '../../routes/internal/streams/processing/common_processing_helpers';

const STREAMS_INDEX = '.kibana_streams';

const suggestDissectPatternSchema = z.object({
  streamName: z.string().describe('Name of the stream to fetch sample log lines from'),
  delimiterHints: z
    .string()
    .optional()
    .describe(
      'Optional: hints about delimiters used in the logs (e.g., "pipe-separated", "comma and space separated")'
    ),
  guidance: z
    .string()
    .optional()
    .describe(
      'Optional guidance to influence pattern generation (e.g., "logs are tab-separated", "extract timestamp and message fields")'
    ),
  sampleSize: z.number().optional().describe('Number of sample documents to fetch (default: 10)'),
});

type SuggestDissectPatternParams = z.infer<typeof suggestDissectPatternSchema>;

export function createSuggestDissectPatternTool({
  core,
  logger,
}: {
  core: CoreSetup<StreamsPluginStartDependencies>;
  logger: Logger;
}): BuiltinToolDefinition<typeof suggestDissectPatternSchema> {
  return {
    id: STREAMS_SUGGEST_DISSECT_PATTERN_TOOL_ID,
    type: ToolType.builtin,
    description: `⚠️ CRITICAL: You MUST use this tool to generate dissect patterns. DO NOT attempt to write dissect patterns manually.

Dissect patterns require precise delimiter handling. This tool analyzes sample data to generate correct patterns automatically.

Use this tool for parsing delimiter-based logs like:
- CSV/TSV logs
- Space-separated logs
- Pipe-delimited logs
- Any structured format with consistent delimiters

WORKFLOW:
1. Call THIS TOOL (streams.suggest_dissect_pattern) with:
   - streamName: The stream to analyze
   - guidance: Description of format (e.g., "tab-separated with timestamp and message")
2. Tool fetches sample documents and generates pattern
3. Tool returns complete dissect processor config in streamlang format
4. Use the returned processor in your pipeline
5. Call streams.simulate_pipeline to test it

The tool returns:
- Complete dissect processor in streamlang format with "action": "dissect"
- List of fields that will be extracted
- Pattern description
- Confidence level

When to use dissect vs grok:
- ✅ Use dissect for: Structured logs with consistent delimiters (faster)
- ✅ Use grok for: Complex logs that need regex matching (more flexible)

DO NOT:
- ❌ Write dissect patterns manually (delimiter handling is tricky)
- ❌ Guess at pattern syntax
- ❌ Try to construct dissect processors yourself

ALWAYS: Use this tool to generate dissect patterns automatically`,
    tags: ['streams', 'dissect', 'parsing', 'enrichment', 'log-analysis'],
    schema: suggestDissectPatternSchema,
    handler: async ({ streamName, guidance }: SuggestDissectPatternParams, context) => {
      const toolLogger = logger.get('suggest_dissect_pattern');

      try {
        context.events.reportProgress('Fetching stream definition...');

        const [coreStart, pluginsStart] = await core.getStartServices();
        const scopedClusterClient = coreStart.elasticsearch.client.asScoped(context.request);

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
                  message: `Stream "${streamName}" is not a valid ingest stream.`,
                },
              },
            ],
          };
        }

        context.events.reportProgress('Fetching sample documents from stream...');

        // Fetch sample documents from the stream's backing index
        const sampleDocs = await scopedClusterClient.asCurrentUser.search({
          index: streamDefinition.name,
          size: 10,
          sort: [{ '@timestamp': { order: 'desc' } }],
        });

        if (sampleDocs.hits.hits.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `No documents found in stream "${streamName}". Cannot generate dissect pattern without sample data.`,
                },
              },
            ],
          };
        }

        // Extract message field from documents (typically message, log.original, or similar)
        const logSamples = sampleDocs.hits.hits
          .map((hit) => {
            const source = hit._source as Record<string, any>;
            // Try common log message fields
            return source.message || source['log.original'] || source.log || JSON.stringify(source);
          })
          .filter((log) => typeof log === 'string')
          .join('\n');

        if (!logSamples) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Could not extract log messages from stream "${streamName}". Documents may not have a 'message' field.`,
                },
              },
            ],
          };
        }

        context.events.reportProgress('Analyzing log samples to generate dissect pattern...');

        const defaultModel = await context.modelProvider.getDefaultModel();
        const streamsClient = pluginsStart.streams.asScoped(context.request);
        const fieldsMetadataClient = await pluginsStart.fieldsMetadata.getClient(context.request);

        toolLogger.debug(
          `Using connector "${defaultModel.connector.name}" (${defaultModel.connector.connectorId}) for dissect pattern suggestion`
        );

        if (guidance) {
          toolLogger.debug(`Dissect pattern guidance provided: ${guidance}`);
        }

        // Extract dissect pattern using heuristics
        const logMessages = logSamples.split('\n').filter(Boolean);
        const dissectPattern = extractDissectPattern(logMessages);
        const reviewFields = getReviewFields(dissectPattern, 10);

        context.events.reportProgress('Refining field mappings with AI...');

        // Determine if we should use OTEL field names
        const useOtelFieldNames = await determineOtelFieldNameUsage(streamsClient, streamName);

        // Call LLM to review fields and map to ECS/OTEL schema
        const reviewResult = await callInferenceWithPrompt(
          pluginsStart.inference.getClient({ request: context.request }),
          defaultModel.connector.connectorId,
          ReviewDissectFieldsPrompt,
          logMessages.slice(0, 10), // Send first 10 samples to LLM
          reviewFields,
          context.abortSignal
        );

        // Fetch field metadata for proper ECS/OTEL field name resolution
        const fieldMetadata = await fetchFieldMetadata(
          fieldsMetadataClient,
          reviewResult.fields.map((field: { ecs_field: string }) => field.ecs_field)
        );

        // Map fields to proper schema-compliant names
        const fields = reviewResult.fields.map(
          (field: { ecs_field: string; columns: string[] }) => {
            const normalizedName = normalizeFieldName(
              field.ecs_field,
              fieldMetadata,
              useOtelFieldNames
            );
            return {
              ecs_field: normalizedName,
              columns: field.columns,
            };
          }
        );

        toolLogger.debug(
          `Generated dissect pattern with ${fields.length} field(s): ${fields
            .map((f) => f.ecs_field)
            .join(', ')}`
        );
        toolLogger.debug(`Detected log source: ${reviewResult.log_source}`);

        // Build the complete dissect processor in streamlang format
        const dissectProcessor = {
          action: 'dissect' as const,
          from: 'message',
          pattern: dissectPattern,
        };

        return {
          results: [
            {
              type: ToolResultType.json,
              data: {
                log_source: reviewResult.log_source,
                fields,
                processor: dissectProcessor,
                message: `Generated dissect pattern for ${reviewResult.log_source} logs with ${fields.length} field(s). Use this processor in your pipeline.`,
              },
            },
          ],
        };
      } catch (error) {
        toolLogger.error(`Error suggesting dissect pattern: ${error.message}`);
        toolLogger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate dissect pattern: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
