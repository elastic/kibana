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
import { suggestProcessingPipeline } from '@kbn/streams-ai';
import { Streams } from '@kbn/streams-schema';
import { transpileIngestPipeline } from '@kbn/streamlang';
import type { StreamlangDSL } from '@kbn/streamlang';
import type {
  ProcessingSimulationResponse,
  FlattenRecord,
  SimulationDocReport,
} from '@kbn/streams-schema';
import { STREAMS_SUGGEST_PIPELINE_TOOL_ID } from '../constants';
import type { StreamsPluginStartDependencies } from '../../types';

const STREAMS_INDEX = '.kibana_streams';

const suggestPipelineSchema = z.object({
  streamName: z.string().describe('Name of the stream to generate pipeline suggestions for'),
  parsingProcessor: z
    .record(z.any())
    .optional()
    .describe(
      'Optional pre-generated parsing processor from streams.suggest_grok_pattern or streams.suggest_dissect_pattern. If provided, this processor will be used as the first step in the pipeline.'
    ),
  guidance: z
    .string()
    .optional()
    .describe(
      'Optional guidance to influence the pipeline suggestions. Use this to provide context about what kind of processing the user wants (e.g., "extract IP addresses", "parse timestamps", "enrich with geo data").'
    ),
  sampleSize: z
    .number()
    .optional()
    .describe('Number of sample documents to fetch for analysis (default: 10)'),
});

type SuggestPipelineParams = z.infer<typeof suggestPipelineSchema>;

export function createSuggestPipelineTool({
  core,
  logger,
}: {
  core: CoreSetup<StreamsPluginStartDependencies>;
  logger: Logger;
}): BuiltinToolDefinition<typeof suggestPipelineSchema> {
  return {
    id: STREAMS_SUGGEST_PIPELINE_TOOL_ID,
    type: ToolType.builtin,
    description: `Analyzes a stream's data and generates a complete processing pipeline suggestion using AI.

⚠️ CRITICAL WORKFLOW - Follow this order:
1. If you need log parsing (grok/dissect):
   - FIRST call streams.suggest_grok_pattern OR streams.suggest_dissect_pattern
   - DO NOT write patterns manually - use these tools to generate them
   - Get the processor config from the tool result
2. THEN call THIS TOOL (streams.suggest_pipeline) with:
   - streamName: The stream to analyze
   - parsingProcessor: The processor from step 1 (if you called grok/dissect tools)
   - guidance: Description of what other processing is needed
3. Tool returns complete pipeline with parsing + additional processors

Use this tool when the user wants to:
- Automatically generate a complete processing pipeline
- Get suggestions for parsing, enrichment, and transformation steps
- Set up initial processing for a new stream
- Improve an existing pipeline

The tool fetches sample documents, analyzes them, and returns a complete pipeline with:
- Pre-generated parsing processor (if you provided one)
- Field enrichment steps
- Data transformations
- Recommended field mappings

After getting the pipeline suggestion, test it with streams.simulate_pipeline before applying.`,
    tags: ['streams', 'processing', 'pipeline', 'enrichment', 'ai'],
    schema: suggestPipelineSchema,
    handler: async ({ streamName, guidance, sampleSize = 10 }: SuggestPipelineParams, context) => {
      const toolLogger = logger.get('suggest_pipeline');

      try {
        context.events.reportProgress('Fetching stream definition...');

        const [coreStart, pluginsStart] = await core.getStartServices();
        const scopedClusterClient = coreStart.elasticsearch.client.asScoped(context.request);
        const fieldsMetadataClient = await pluginsStart.fieldsMetadata.getClient(context.request);

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
                  message: `Stream "${streamName}" is not a valid ingest stream. Pipeline suggestions are only supported for ingest streams.`,
                },
              },
            ],
          };
        }

        context.events.reportProgress('Fetching sample documents from stream...');

        // Fetch sample documents from the stream's backing index
        const sampleDocs = await scopedClusterClient.asCurrentUser.search({
          index: streamDefinition.name,
          size: sampleSize,
          sort: [{ '@timestamp': { order: 'desc' } }],
        });

        if (sampleDocs.hits.hits.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `No documents found in stream "${streamName}". Cannot generate pipeline suggestions without sample data.`,
                },
              },
            ],
          };
        }

        // Convert documents to flattened format
        const documents = sampleDocs.hits.hits.map((hit) => hit._source as Record<string, any>);

        context.events.reportProgress('Generating pipeline suggestions with AI...');

        // Get the default model for inference
        const defaultModel = await context.modelProvider.getDefaultModel();

        toolLogger.debug(
          `Using connector "${defaultModel.connector.name}" (${defaultModel.connector.connectorId}) for pipeline suggestions`
        );

        if (guidance) {
          toolLogger.debug(`Pipeline guidance provided: ${guidance}`);
        }

        // Use the suggestProcessingPipeline function from @kbn/streams-ai
        const pipeline = await suggestProcessingPipeline({
          definition: streamDefinition,
          inferenceClient: defaultModel.inferenceClient,
          parsingProcessor: undefined, // Let the AI determine parsing needs
          maxSteps: 4,
          documents,
          esClient: scopedClusterClient.asCurrentUser,
          fieldsMetadataClient,
          simulatePipeline: async (
            pipelineDSL: StreamlangDSL
          ): Promise<ProcessingSimulationResponse> => {
            // Transpile the streamlang pipeline to ingest processors
            const transpiledPipeline = transpileIngestPipeline(pipelineDSL, {
              ignoreMalformed: true,
              traceCustomIdentifiers: true,
            });

            // Prepare documents for simulation
            const simulationDocs = documents.map((doc, index) => ({
              _index: streamName,
              _id: String(index),
              _source: doc,
            }));

            // Run the simulation using Elasticsearch's ingest pipeline simulate API
            const simulationResult = await scopedClusterClient.asCurrentUser.ingest.simulate({
              docs: simulationDocs,
              pipeline: {
                processors: transpiledPipeline.processors.map((processor) => {
                  const type = Object.keys(processor)[0];
                  const processorConfig = (processor as any)[type];
                  return {
                    [type]: {
                      ...processorConfig,
                      ignore_failure: false,
                    },
                  };
                }),
              },
            });

            // Process simulation results
            const docReports: SimulationDocReport[] = simulationResult.docs.map((doc, index) => {
              const hasError = doc.error !== undefined;
              const originalDoc = documents[index];
              const processedDoc = doc.doc?._source || originalDoc;

              return {
                detected_fields: [],
                errors: hasError
                  ? [
                      {
                        message: doc.error?.reason || 'Unknown error',
                        type: doc.error?.type || 'simulation_error',
                      },
                    ]
                  : [],
                status: hasError ? ('failed' as const) : ('parsed' as const),
                value: processedDoc as FlattenRecord,
              };
            });

            const successfulCount = docReports.filter((r) => r.status === 'parsed').length;

            return {
              detected_fields: [],
              documents: docReports,
              processors_metrics: {},
              definition_error: undefined,
              documents_metrics: {
                successful: successfulCount,
                failed: docReports.length - successfulCount,
                ignored: 0,
              },
            };
          },
          guidance,
        });

        const pipelineStepCount = pipeline?.steps?.length || 0;

        toolLogger.debug(`Generated pipeline with ${pipelineStepCount} step(s)`);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                streamName,
                pipeline,
                message: `Generated processing pipeline with ${pipelineStepCount} step(s) for stream "${streamName}". The pipeline includes parsing, enrichment, and transformation steps based on the sample data analyzed.`,
              },
            },
          ],
        };
      } catch (error) {
        toolLogger.error(`Error suggesting pipeline for stream "${streamName}": ${error.message}`);
        toolLogger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate pipeline suggestions: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
