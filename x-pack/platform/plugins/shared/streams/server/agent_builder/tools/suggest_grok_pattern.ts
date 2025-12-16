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
import { Streams, isOtelStream } from '@kbn/streams-schema';
import {
  extractGrokPatternDangerouslySlow,
  getReviewFields,
  ReviewFieldsPrompt,
} from '@kbn/grok-heuristics';
import type { StreamsPluginStartDependencies } from '../../types';
import { STREAMS_SUGGEST_GROK_PATTERN_TOOL_ID } from '../constants';
import {
  callInferenceWithPrompt,
  fetchFieldMetadata,
  normalizeFieldName,
} from '../../routes/internal/streams/processing/common_processing_helpers';

const STREAMS_INDEX = '.kibana_streams';

const suggestGrokPatternSchema = z.object({
  streamName: z.string().describe('Name of the stream to fetch sample log lines from'),
  fieldToExtract: z
    .string()
    .optional()
    .describe('Optional: specific field name you want to extract (e.g., "timestamp", "user_id")'),
  guidance: z
    .string()
    .optional()
    .describe(
      'Optional guidance to influence pattern generation (e.g., "this is an Apache access log", "extract IP addresses and response codes")'
    ),
  sampleSize: z.number().optional().describe('Number of sample documents to fetch (default: 10)'),
});

type SuggestGrokPatternParams = z.infer<typeof suggestGrokPatternSchema>;

export function createSuggestGrokPatternTool({
  core,
  logger,
}: {
  core: CoreSetup<StreamsPluginStartDependencies>;
  logger: Logger;
}): BuiltinToolDefinition<typeof suggestGrokPatternSchema> {
  return {
    id: STREAMS_SUGGEST_GROK_PATTERN_TOOL_ID,
    type: ToolType.builtin,
    description: `⚠️ CRITICAL: You MUST use this tool to generate grok patterns. DO NOT attempt to write grok patterns manually.

Grok patterns are extremely complex and error-prone. This tool uses AI and sample data to generate correct patterns automatically.

Use this tool for parsing unstructured logs like:
- Apache/Nginx access logs
- Syslog messages
- Application logs with custom formats
- Any complex log format that needs regex matching

WORKFLOW:
1. Call THIS TOOL (streams.suggest_grok_pattern) with:
   - streamName: The stream to analyze
   - guidance: Description of what to extract (e.g., "extract timestamp, user, and status code")
2. Tool fetches sample documents and generates pattern
3. Tool returns complete grok processor config in streamlang format
4. Use the returned processor in your pipeline
5. Call streams.simulate_pipeline to test it

The tool returns:
- Complete grok processor in streamlang format with "action": "grok"
- List of fields that will be extracted
- Pattern description
- Confidence level

DO NOT:
- ❌ Write grok patterns manually (they're too complex)
- ❌ Guess at pattern syntax
- ❌ Try to construct grok processors yourself

ALWAYS: Use this tool to generate grok patterns automatically`,
    tags: ['streams', 'grok', 'parsing', 'enrichment', 'log-analysis'],
    schema: suggestGrokPatternSchema,
    handler: async ({ streamName, guidance }: SuggestGrokPatternParams, context) => {
      const toolLogger = logger.get('suggest_grok_pattern');

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
                  message: `No documents found in stream "${streamName}". Cannot generate grok pattern without sample data.`,
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

        context.events.reportProgress('Analyzing log samples to generate grok pattern...');

        const defaultModel = await context.modelProvider.getDefaultModel();
        const fieldsMetadataClient = await pluginsStart.fieldsMetadata.getClient(context.request);

        toolLogger.debug(
          `Using connector "${defaultModel.connector.name}" (${defaultModel.connector.connectorId}) for grok pattern suggestion`
        );

        if (guidance) {
          toolLogger.debug(`Grok pattern guidance provided: ${guidance}`);
        }

        // Extract grok pattern using heuristics
        const logMessages = logSamples.split('\n').filter(Boolean);
        const grokPatternNodes = extractGrokPatternDangerouslySlow(logMessages);
        const reviewFields = getReviewFields(grokPatternNodes, 10);

        context.events.reportProgress('Refining field mappings with AI...');

        // Call LLM to review fields and map to ECS/OTEL schema
        const reviewResult = await callInferenceWithPrompt(
          pluginsStart.inference.getClient({ request: context.request }),
          defaultModel.connector.connectorId,
          ReviewFieldsPrompt,
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
        const useOtelFieldNames = isOtelStream(streamDefinition);
        const fields = reviewResult.fields.map(
          (field: { ecs_field: string; columns: string[]; grok_components: string[] }) => {
            const normalizedName = normalizeFieldName(
              field.ecs_field,
              fieldMetadata,
              useOtelFieldNames
            );
            return {
              name: normalizedName,
              columns: field.columns,
              grok_components: field.grok_components,
            };
          }
        );

        toolLogger.debug(
          `Generated grok pattern with ${fields.length} field(s): ${fields
            .map((f) => f.name)
            .join(', ')}`
        );
        toolLogger.debug(`Detected log source: ${reviewResult.log_source}`);

        // Build the complete grok processor in streamlang format
        const grokProcessor = {
          action: 'grok' as const,
          from: 'message',
          patterns: fields.flatMap((f) => f.grok_components),
          pattern_definitions: {},
        };

        return {
          results: [
            {
              type: ToolResultType.json,
              data: {
                log_source: reviewResult.log_source,
                fields,
                processor: grokProcessor,
                message: `Generated grok pattern for ${reviewResult.log_source} logs with ${fields.length} field(s). Use this processor in your pipeline.`,
              },
            },
          ],
        };
      } catch (error) {
        toolLogger.error(`Error suggesting grok pattern: ${error.message}`);
        toolLogger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate grok pattern: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
