/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentAnalysis } from '@kbn/ai-tools';
import { mergeSampleDocumentsWithFieldCaps, formatDocumentAnalysis } from '@kbn/ai-tools';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { z } from '@kbn/zod';
import { omit } from 'lodash';
import { format, inspect } from 'util';
import type { Omit } from 'utility-types';
import type { StreamlangProcessorDefinition } from '@kbn/streamlang';
import type { Streams } from '@kbn/streams-schema';
import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { simulatePipeline } from './simulate_pipeline';
import type { GenerateProcessorsPrompt } from './generate_processors/prompt';
import { processingSchema } from '../../../json_schema/processing_schema';
import type { ProcessingService } from './types';

type ProcessorPrompt = typeof GenerateProcessorsPrompt;

type OmitOverUnion<T, U extends keyof T> = T extends any ? Omit<T, U> : never;

type Input = OmitOverUnion<
  z.input<ProcessorPrompt['input']>,
  'stream' | 'sample_data' | 'processor_schema'
>;

export async function callProcessingPrompt({
  input,
  prompt,
  analysis,
  inferenceClient,
  definition,
  logger,
  signal,
  processing,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  analysis: DocumentAnalysis;
  input: Input;
  prompt: ProcessorPrompt;
  processing: ProcessingService;
}): Promise<{ processors: StreamlangProcessorDefinition[]; analysis: DocumentAnalysis }> {
  const { samples, fieldCaps, total } = analysis;

  const truncatedAnalysis = formatDocumentAnalysis(analysis, {
    dropEmpty: true,
    dropUnmapped: false,
  });

  const assistantResponse = await executeAsReasoningAgent({
    inferenceClient,
    prompt,
    abortSignal: signal,
    finalToolChoice: { function: 'finalize_pipeline' },
    input: {
      stream: {
        name: definition.name,
        description: definition.description,
      },
      sample_data: JSON.stringify(truncatedAnalysis),
      processor_schema: JSON.stringify(processingSchema),
      ...input,
    },
    power: 'high',
    toolCallbacks: {
      finalize_pipeline: async (toolCall) => {
        return {
          response: {
            acknowledged: true,
          },
        };
      },
      validate_pipeline: async (toolCall) => {
        return await simulatePipeline(definition.name, {
          service: processing,
          samples,
          processors: toolCall.function.arguments.processors.map(({ id, config }) => {
            return {
              ...config,
              id,
            } as StreamlangProcessorDefinition & { id: string };
          }),
        })
          .then(async (simulatePipelineResponse) => {
            const validities = simulatePipelineResponse.results.map(
              ({ result }) => result.validity
            );

            const overallValidity = validities.every((validity) => validity === 'success')
              ? 'success'
              : validities.some((validity) => validity === 'failure')
              ? 'failure'
              : 'partial';

            return {
              response: {
                validity: overallValidity,
                results: simulatePipelineResponse.results,
              },
            };
          })
          .catch((error) => {
            return {
              response: {
                error: format(error),
              },
            };
          });
      },
    },
  });

  const processors =
    assistantResponse?.toolCalls.flatMap((toolCall) =>
      toolCall.function.name === 'finalize_pipeline'
        ? toolCall.function.arguments.processors.map(
            (processor) =>
              ({
                id: processor.id,
                ...processor.config,
              } as StreamlangProcessorDefinition & { id: string })
          )
        : []
    ) ?? [];

  const { output, results } = await simulatePipeline(definition.name, {
    processors,
    samples,
    service: processing,
  });

  if (results.some(({ result }) => result.validity === 'failure')) {
    logger.error(
      inspect(
        results.map((result) => omit(result, 'output')),
        { depth: null }
      )
    );
    throw new Error(`Failed to generate all-valid processors`);
  }

  return {
    analysis: mergeSampleDocumentsWithFieldCaps({
      total,
      fieldCaps,
      hits: output,
    }),
    processors: processors.map(({ id, ...config }) => config as StreamlangProcessorDefinition),
  };
}
