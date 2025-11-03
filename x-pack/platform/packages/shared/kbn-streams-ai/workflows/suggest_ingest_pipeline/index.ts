/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Streams } from '@kbn/streams-schema';
import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { simulateProcessing } from '@kbn/streams-plugin/server/routes/internal/streams/processing/simulation_handler';
import type { FlattenRecord } from '@kbn/streams-schema';
import { SuggestIngestPipelinePrompt } from './prompt';
import { getPipelineDefinitionJsonSchema, pipelineDefinitionSchema } from './schema';
import taskPromptTemplate from './task_prompt.text';
import { generateParsingProcessor } from './generate_parsing_processors';

export interface IngestPipeline {
  description?: string;
  processors: Array<Record<string, any>>;
  on_failure?: Array<Record<string, any>> | Record<string, any>;
  version?: number;
}

export async function suggestIngestPipeline({
  definition,
  inferenceClient,
  esClient,
  logger,
  start,
  end,
  maxSteps,
  signal,
  simulatePipeline,
  documents,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  maxSteps?: number | undefined;
  signal: AbortSignal;
  simulatePipeline(pipeline: StreamlangDSL): ReturnType<typeof simulateProcessing>;
  documents: FlattenRecord[];
}): Promise<IngestPipeline | null> {
  // Get initial dataset analysis similar to identifyFeatures
  const initialAnalysis = await describeDataset({
    esClient,
    start,
    end,
    index: definition.name,
  });

  // No need to involve reasoning if there are no sample documents
  if (initialAnalysis.sampled === 0) {
    return null;
  }

  // Generate parsing processor using rule-based approach
  const parsingProcessor = generateParsingProcessor(documents);

  const datasetAnalysis = initialAnalysis;

  // If parsing processor was generated, simulate it and re-analyze parsed documents
  const result = await simulatePipeline({
    steps: parsingProcessor ? [parsingProcessor] : [],
  });
  console.log('simulatePipeline result', result);

  const truncatedAnalysis = sortAndTruncateAnalyzedFields(datasetAnalysis, {
    dropEmpty: true,
    dropUnmapped: false,
  });

  console.log('Truncated dataset analysis', truncatedAnalysis);

  const response = await executeAsReasoningAgent({
    inferenceClient,
    prompt: SuggestIngestPipelinePrompt,
    input: {
      stream: definition,
      pipeline_schema: JSON.stringify(getPipelineDefinitionJsonSchema(pipelineDefinitionSchema)),
      initial_dataset_analysis: JSON.stringify({
        analysis: truncatedAnalysis,
        fields: datasetAnalysis.fields.map((f) => ({
          name: f.name,
          types: f.types,
          cardinality: f.cardinality,
          empty: f.empty,
          sampleValues: f.values.slice(0, 10), // Include sample values
        })),
        total: datasetAnalysis.total,
        sampled: datasetAnalysis.sampled,
      }),
      task_description: taskPromptTemplate,
      // previous_pipeline: previousPipeline,
      parsing_processor: parsingProcessor ? JSON.stringify(parsingProcessor) : undefined,
    },
    maxSteps,
    toolCallbacks: {
      simulate_pipeline: async (toolCall) => {
        console.log(
          'simulate_pipeline tool call:',
          toolCall.function.name,
          toolCall.function.arguments.pipeline
        );

        // First, validate the pipeline schema
        const pipeline = pipelineDefinitionSchema.safeParse(toolCall.function.arguments.pipeline);
        if (!pipeline.success) {
          return {
            response: {
              valid: false,
              errors: pipeline.error.issues,
              pipeline: toolCall.function.arguments.pipeline,
            },
          };
        }

        const validatedPipeline = pipeline.data;

        const simulateResult = await simulatePipeline(validatedPipeline);

        console.log('simulateResult', simulateResult);

        return {
          response: {
            valid: false,
            errors: undefined,
            pipeline,
          },
        };

        // const validationErrors: string[] = [];

        // if (pipeline.data.steps.length === 0) {
        //   validationErrors.push('Pipeline must have at least one processor');
        // }

        // // Check if timestamp extraction is present (critical for ingest pipelines)
        // const hasTimestampProcessor = pipeline.data.steps.some((step) => step.action === 'date');

        // if (!hasTimestampProcessor) {
        //   validationErrors.push(
        //     'Warning: Pipeline should extract and set @timestamp field. Consider adding a date processor.'
        //   );
        // }

        // // Check for error handling
        // // if (!pipeline.on_failure) {
        // //   validationErrors.push(
        // //     'Warning: Pipeline should have on_failure handlers to handle processing errors gracefully.'
        // //   );
        // // }

        // if (validationErrors.length > 0) {
        //   return {
        //     response: {
        //       valid: false,
        //       errors: validationErrors,
        //       pipeline,
        //     },
        //   };
        // }

        // // Validation passed - always run simulation against the data stream
        // const ingestPipeline = toolCall.function.arguments.pipeline as IngestPipeline;

        // // Fetch sample documents from the data stream for simulation
        // const simulationSearchResponse = await esClient.search<Record<string, any>>({
        //   index: definition.name,
        //   size: 1000, // Use a reasonable sample size for simulation
        //   track_total_hits: true,
        //   query: {
        //     bool: {
        //       must: dateRangeQuery(start, end),
        //       should: [
        //         {
        //           function_score: {
        //             functions: [
        //               {
        //                 random_score: {},
        //               },
        //             ],
        //           },
        //         },
        //       ],
        //     },
        //   },
        //   sort: {
        //     _score: {
        //       order: 'desc',
        //     },
        //   },
        //   _source: true,
        // });

        // const simulationSampleHits = simulationSearchResponse.hits.hits as Array<
        //   SearchHit<Record<string, any>>
        // >;

        // if (simulationSampleHits.length === 0) {
        //   return {
        //     response: {
        //       valid: true,
        //       pipeline: validatedPipeline,
        //       simulation: {
        //         error: {
        //           type: 'no_samples_error',
        //           message: 'No documents found in the data stream for simulation',
        //         },
        //         metrics: {
        //           successRate: 0,
        //           timestampCoverage: 0,
        //           messageCoverage: 0,
        //           errorRate: 100,
        //           total: 0,
        //           successful: 0,
        //           errors: 0,
        //         },
        //       },
        //     },
        //   };
        // }

        // // Prepare documents for simulation
        // const docs = simulationSampleHits.map((hit) => ({
        //   _index: definition.name,
        //   _id: hit._id || `sim_${Date.now()}_${Math.random()}`,
        //   _source: hit._source || {},
        // }));

        // try {
        //   const simulateRequest: IngestSimulateRequest = {
        //     pipeline: {
        //       description: ingestPipeline.description,
        //       processors: ingestPipeline.processors,
        //       // on_failure: ingestPipeline.on_failure,
        //       version: ingestPipeline.version,
        //     },
        //     docs,
        //   };

        //   const simulationResult = await esClient.ingest.simulate(simulateRequest);

        //   // Analyze results
        //   const results = simulationResult.docs.map((doc, idx) => {
        //     const error = doc.error;
        //     const processedDoc = doc.doc?._source;
        //     const hasTimestamp = processedDoc && '@timestamp' in processedDoc;
        //     const hasMessage =
        //       processedDoc && ('message' in processedDoc || 'log.message' in processedDoc);

        //     return {
        //       index: idx,
        //       success: !error && !!processedDoc,
        //       error: error
        //         ? {
        //             type: error.type,
        //             reason: error.reason,
        //           }
        //         : null,
        //       hasTimestamp,
        //       hasMessage,
        //       fields: processedDoc ? Object.keys(processedDoc) : [],
        //       sampleOutput: processedDoc
        //         ? {
        //             '@timestamp': processedDoc['@timestamp'],
        //             message: processedDoc.message || processedDoc['log.message'] || 'N/A',
        //             ...Object.fromEntries(
        //               Object.entries(processedDoc)
        //                 .filter(([k]) => !['@timestamp', 'message', 'log.message'].includes(k))
        //                 .slice(0, 10)
        //             ),
        //           }
        //         : null,
        //     };
        //   });

        //   const total = results.length;
        //   const successful = results.filter((r) => r.success).length;
        //   const withTimestamp = results.filter((r) => r.hasTimestamp).length;
        //   const withMessage = results.filter((r) => r.hasMessage).length;
        //   const errors = results.filter((r) => r.error).length;

        //   const metrics = {
        //     successRate: total > 0 ? (successful / total) * 100 : 0,
        //     timestampCoverage: total > 0 ? (withTimestamp / total) * 100 : 0,
        //     messageCoverage: total > 0 ? (withMessage / total) * 100 : 0,
        //     errorRate: total > 0 ? (errors / total) * 100 : 0,
        //     total,
        //     successful,
        //     errors,
        //   };

        //   return {
        //     response: {
        //       valid: true,
        //       pipeline: validatedPipeline,
        //       simulation: {
        //         metrics,
        //         results,
        //         summary: {
        //           totalProcessed: total,
        //           successful,
        //           failed: errors,
        //           timestampCoverage: `${metrics.timestampCoverage.toFixed(1)}%`,
        //           messageCoverage: `${metrics.messageCoverage.toFixed(1)}%`,
        //         },
        //       },
        //     },
        //   };
        // } catch (error) {
        //   logger.error('Pipeline simulation error', error);
        //   return {
        //     response: {
        //       valid: true,
        //       pipeline: validatedPipeline,
        //       simulation: {
        //         error: {
        //           type: 'simulation_error',
        //           message: error instanceof Error ? error.message : String(error),
        //         },
        //         metrics: {
        //           successRate: 0,
        //           timestampCoverage: 0,
        //           messageCoverage: 0,
        //           errorRate: 100,
        //           total: simulationSampleHits.length,
        //           successful: 0,
        //           errors: simulationSampleHits.length,
        //         },
        //       },
        //     },
        //   };
        // }
      },
      commit_pipeline: async (toolCall) => {
        console.log('commit_pipeline tool call', toolCall);
        return {
          response: {
            committed: true,
            message: toolCall.function.arguments.message || 'Pipeline committed successfully',
          },
        };
      },
    },
    finalToolChoice: {
      type: 'function',
      function: 'commit_pipeline',
    },
    abortSignal: signal,
  });
  console.log('response', response);

  // Extract the final pipeline from the last simulate_pipeline call
  const allToolCalls = (response.toolCalls ?? []) as Array<
    | { function: { name: 'simulate_pipeline'; arguments: { pipeline: unknown } } }
    | { function: { name: 'commit_pipeline'; arguments: { message?: string } } }
  >;
  const lastSimulatePipelineCall = allToolCalls.findLast(
    (tc) => tc.function.name === 'simulate_pipeline'
  );
  if (!lastSimulatePipelineCall || lastSimulatePipelineCall.function.name !== 'simulate_pipeline') {
    return null;
  }
  const pipeline = lastSimulatePipelineCall.function.arguments.pipeline as IngestPipeline;
  console.log('pipeline', pipeline);

  // Verify it was committed
  const commitCalls =
    response?.toolCalls?.filter((tc) => tc.function.name === 'commit_pipeline') ?? [];
  if (commitCalls.length === 0) {
    logger.warn('Pipeline was generated but not committed');
  }

  return pipeline;
}
