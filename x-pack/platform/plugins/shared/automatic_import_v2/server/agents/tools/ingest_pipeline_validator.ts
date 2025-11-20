/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolRunnableConfig } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Command } from '@langchain/langgraph';
import { ToolMessage } from '@langchain/core/messages';
import { z } from '@kbn/zod';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';

interface DocTemplate {
  _index: string;
  _id: string;
  _source: {
    message: string;
    [key: string]: unknown;
  };
}

function formatSample(sample: string): DocTemplate {
  return {
    _index: 'index',
    _id: 'id',
    _source: { message: sample },
  };
}

interface FailedSample {
  sample: string;
  error: string;
}

/**
 * Creates a standalone langgraph tool that validates an ingest pipeline against samples.
 * This function can be used independently or through the IngestPipelineValidatorTool class.
 *
 * @param esClient - Elasticsearch client for simulating the pipeline
 * @param samples - Array of log samples to validate the pipeline against
 * @returns DynamicStructuredTool instance for use in langgraph agents
 */
export function ingestPipelineValidatorTool(
  esClient: ElasticsearchClient,
  samples: string[]
): DynamicStructuredTool {
  const validatorSchema = z.object({
    generated_pipeline: z
      .object({
        processors: z.array(z.any()).describe('The processors in the pipeline'),
        on_failure: z
          .array(z.any())
          .optional()
          .describe('Optional failure handlers for the pipeline'),
      })
      .describe('The generated ingest pipeline to validate'),
  });
  return new DynamicStructuredTool({
    name: 'validate_ingest_pipeline',
    description:
      'Validates a generated ingest pipeline by testing it against log samples. ' +
      'Simulates the pipeline to verify it works correctly. ' +
      'Returns validation results including success rate, failed samples, and error details.',
    schema: z.object({
      generated_pipeline: z
        .object({
          processors: z.array(z.any()).describe('The processors in the pipeline'),
          on_failure: z
            .array(z.any())
            .optional()
            .describe('Optional failure handlers for the pipeline'),
        })
        .describe('The generated ingest pipeline to validate'),
    }),
    func: async (
      input: z.infer<typeof validatorSchema>,
      _runManager?: CallbackManagerForToolRun,
      config?: ToolRunnableConfig
    ) => {
      const { generated_pipeline: generatedPipeline } = input;

      try {
        if (!samples || samples.length === 0) {
          const message = `No samples available for validation`;
          return new Command({
            update: {
              pipeline_generation_results: [],
              failure_count: 0,
              pipeline_validation_results: {
                success_rate: 0,
                successful_samples: 0,
                failed_samples: 0,
                total_samples: 0,
                failure_details: [],
              },
              messages: [
                new ToolMessage({
                  content: message,
                  tool_call_id: config?.toolCall?.id as string,
                }),
              ],
            },
          });
        }

        // Format samples for pipeline simulation
        const docs = samples.map((sample: string) => formatSample(sample));

        // Simulate the pipeline
        let response;
        try {
          response = await esClient.ingest.simulate({
            docs,
            pipeline: generatedPipeline,
          });
        } catch (simulateError) {
          const errorMessage = `Pipeline simulation failed: ${(simulateError as Error).message}`;
          return new Command({
            update: {
              pipeline_generation_results: [],
              failure_count: samples.length,
              pipeline_validation_results: {
                success_rate: 0,
                successful_samples: 0,
                failed_samples: samples.length,
                total_samples: samples.length,
                failure_details: [
                  {
                    error: errorMessage,
                    sample: 'Pipeline validation error',
                  },
                ],
              },
              messages: [
                new ToolMessage({
                  content: errorMessage,
                  tool_call_id: config?.toolCall?.id as string,
                }),
              ],
            },
          });
        }

        // Process simulation results
        const failedSamples: FailedSample[] = [];
        const successfulDocuments: Array<Record<string, unknown>> = [];
        let successfulCount = 0;

        response.docs.forEach((doc, index) => {
          if (!doc) {
            // Document was dropped
            failedSamples.push({
              sample: samples[index],
              error: 'Document was dropped by the pipeline',
            });
          } else if (doc.doc?._source?.error) {
            // Document has an error
            const errorDetail =
              typeof doc.doc._source.error === 'string'
                ? doc.doc._source.error
                : JSON.stringify(doc.doc._source.error);
            failedSamples.push({
              sample: samples[index],
              error: errorDetail,
            });
          } else if (doc.doc?._source) {
            // Document processed successfully
            successfulCount++;
            successfulDocuments.push(doc.doc._source);
          }
        });

        const failedCount = failedSamples.length;
        const totalSamples = samples.length;
        const successRate = totalSamples > 0 ? (successfulCount / totalSamples) * 100 : 0;

        const message =
          failedCount === 0
            ? `Pipeline validation successful! All ${totalSamples} samples processed correctly.`
            : `Pipeline validation completed with ${successfulCount}/${totalSamples} samples successful (${successRate.toFixed(
                1
              )}% success rate). ${failedCount} samples failed.`;

        return new Command({
          update: {
            current_pipeline: generatedPipeline,
            pipeline_generation_results: successfulDocuments,
            failure_count: failedCount,
            pipeline_validation_results: {
              success_rate: successRate,
              successful_samples: successfulCount,
              failed_samples: failedCount,
              total_samples: totalSamples,
              failure_details: failedSamples.slice(0, 100).map((f) => ({
                error: f.error,
                sample: f.sample,
              })),
            },
            messages: [
              new ToolMessage({
                content: message,
                tool_call_id: config?.toolCall?.id as string,
              }),
            ],
          },
        });
      } catch (error) {
        const errorMessage = `Validation tool error: ${(error as Error).message}`;
        return new Command({
          update: {
            pipeline_generation_results: [],
            failure_count: 1,
            pipeline_validation_results: {
              success_rate: 0,
              successful_samples: 0,
              failed_samples: 1,
              total_samples: 1,
              failure_details: [
                {
                  error: errorMessage,
                  sample: 'Tool execution error',
                },
              ],
            },
            messages: [
              new ToolMessage({
                content: errorMessage,
                tool_call_id: config?.toolCall?.id as string,
              }),
            ],
          },
        });
      }
    },
  });
}
