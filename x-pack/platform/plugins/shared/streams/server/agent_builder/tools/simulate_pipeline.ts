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
import { transpileIngestPipeline, streamlangDSLSchema, validateStreamlang } from '@kbn/streamlang';
import type { FlattenRecord, SimulationDocReport } from '@kbn/streams-schema';
import { STREAMS_SIMULATE_PIPELINE_TOOL_ID } from '../constants';
import type { StreamsPluginStartDependencies } from '../../types';

const STREAMS_INDEX = '.kibana_streams';

const simulatePipelineSchema = z.object({
  streamName: z.string().describe('Name of the stream to simulate the pipeline against'),
  pipeline: streamlangDSLSchema.describe(
    'The streamlang pipeline to simulate. Must be in streamlang format with "action" field for each processor.'
  ),
  sampleSize: z
    .number()
    .optional()
    .describe('Number of sample documents to test the pipeline against (default: 10)'),
});

type SimulatePipelineParams = z.infer<typeof simulatePipelineSchema>;

export function createSimulatePipelineTool({
  core,
  logger,
}: {
  core: CoreSetup<StreamsPluginStartDependencies>;
  logger: Logger;
}): BuiltinToolDefinition<typeof simulatePipelineSchema> {
  return {
    id: STREAMS_SIMULATE_PIPELINE_TOOL_ID,
    type: ToolType.builtin,
    description: `Simulates a processing pipeline against real sample documents from a stream.

⚠️ CRITICAL: You MUST call this tool to test any pipeline BEFORE applying it with streams_update_processing_steps.
NEVER apply a pipeline without successful simulation first.

REQUIRED WORKFLOW:
1. If you need grok/dissect parsing:
   - Call streams.suggest_grok_pattern OR streams.suggest_dissect_pattern FIRST
   - DO NOT write patterns manually
2. Construct or generate a pipeline (using streams.suggest_pipeline or manually with streams.get_streamlang_docs)
2. Call THIS TOOL (streams.simulate_pipeline) to test the pipeline
3. Check the results:
   - If successful (no errors) → Apply with streams_update_processing_steps
   - If failed (has errors) → Fix the pipeline and simulate again
4. Repeat simulation until it succeeds before applying

This tool validates whether a pipeline works correctly by:
- Fetching real sample documents from the stream
- Running the pipeline simulation using Elasticsearch
- Reporting success/failure rates and any errors
- Showing which fields are extracted or transformed

The tool returns:
- Overall success/failure counts (summary.successful, summary.failed)
- Per-document results with any errors
- Fields detected/extracted by the pipeline
- Detailed error messages for failed documents (error_details array)

When simulation fails:
- Analyze error messages to understand what went wrong
- Common issues: incorrect field names, invalid patterns, wrong data types
- Use streams.get_streamlang_docs to verify correct processor syntax
- Fix the pipeline and simulate again
- Only apply once simulation shows 100% success rate

This prevents breaking production data processing with faulty pipelines.`,
    tags: ['streams', 'processing', 'pipeline', 'simulation', 'validation'],
    schema: simulatePipelineSchema,
    handler: async ({ streamName, pipeline, sampleSize = 10 }: SimulatePipelineParams, context) => {
      const toolLogger = logger.get('simulate_pipeline');

      try {
        context.events.reportProgress('Fetching stream definition...');

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

        const streamDefinition = searchResult.hits.hits[0]._source!;

        context.events.reportProgress('Validating pipeline syntax...');

        // Validate the streamlang pipeline syntax before simulating
        const validationResult = validateStreamlang(pipeline, {
          reservedFields: [],
        });

        if (!validationResult.isValid) {
          const errorMessages = validationResult.errors.map(
            (err) => `${err.type}: ${err.message} (field: ${err.field})`
          );

          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Pipeline validation failed:\n${errorMessages.join('\n')}`,
                  validation_errors: validationResult.errors,
                },
              },
            ],
          };
        }

        context.events.reportProgress('Fetching sample documents...');

        // Fetch sample documents from the stream
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
                  message: `No documents found in stream "${streamName}". Cannot simulate pipeline without sample data.`,
                },
              },
            ],
          };
        }

        const documents = sampleDocs.hits.hits.map((hit) => hit._source as Record<string, any>);

        context.events.reportProgress(
          `Simulating pipeline against ${documents.length} sample documents...`
        );

        // Transpile the streamlang pipeline to Elasticsearch ingest processors
        const transpiledPipeline = transpileIngestPipeline(pipeline, {
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

          // Detect which fields were added or modified
          const detectedFields = Object.keys(processedDoc).filter(
            (key) => !(key in originalDoc) || originalDoc[key] !== processedDoc[key]
          );

          return {
            detected_fields: detectedFields.map((field) => ({
              name: field,
              type: typeof processedDoc[field],
            })),
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
        const failedCount = docReports.length - successfulCount;

        toolLogger.debug(
          `Simulation completed: ${successfulCount}/${docReports.length} documents processed successfully`
        );

        // Build a summary of the results
        const summary = {
          total_documents: docReports.length,
          successful: successfulCount,
          failed: failedCount,
          success_rate: Math.round((successfulCount / docReports.length) * 100),
          pipeline_steps: pipeline.steps.length,
        };

        const errorSummary =
          failedCount > 0
            ? docReports
                .filter((r) => r.status === 'failed')
                .map((r, index) => ({
                  document_index: index,
                  errors: r.errors,
                }))
            : [];

        return {
          results: [
            {
              type: ToolResultType.json,
              data: {
                summary,
                document_results: docReports,
                error_details: errorSummary,
              },
            },
          ],
        };
      } catch (error) {
        toolLogger.error(`Error simulating pipeline: ${error.message}`, error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to simulate pipeline: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
