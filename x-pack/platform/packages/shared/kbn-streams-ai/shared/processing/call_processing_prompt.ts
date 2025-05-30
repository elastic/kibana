/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeSampleDocumentsWithFieldCaps, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { callPromptUntil } from '@kbn/inference-common';
import {
  ProcessorDefinitionWithId,
  getProcessorConfig,
  getProcessorType,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { castArray, omit } from 'lodash';
import { format, inspect } from 'util';
import { Omit } from 'utility-types';
import { v4 } from 'uuid';
import dedent from 'dedent';
import { GenerateParsersPrompt } from '../../workflows/onboarding/generate_parsers/prompts';
import { GenerateProcessorsPrompt } from '../../workflows/onboarding/generate_processors/prompt';
import { OnboardingTaskContext, OnboardingTaskState } from '../../workflows/onboarding/types';
import dissectDocs from './debug_mismatch/dissect/docs.txt';
import { FormattedMatchFailure } from './debug_mismatch/format_match_failure';
import grokDocs from './debug_mismatch/grok/docs.txt';
import { simulatePipeline } from './simulate_pipeline';

type ProcessorPrompt = typeof GenerateParsersPrompt | typeof GenerateProcessorsPrompt;

type OmitOverUnion<T, U extends keyof T> = T extends any ? Omit<T, U> : never;

type Input = OmitOverUnion<z.input<ProcessorPrompt['input']>, 'stream' | 'sample_data'>;

export async function callProcessingPrompt({
  context: {
    logger,
    inferenceClient,
    signal,
    services: { processing },
  },
  state: {
    dataset: { analysis, samples, total, fieldCaps },
    stream,
    stream: { definition },
  },
  input,
  prompt,
}: {
  context: OnboardingTaskContext;
  state: OnboardingTaskState;
  input: Input;
  prompt: ProcessorPrompt;
}) {
  const truncatedAnalysis = sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true });

  const assistantResponse = await callPromptUntil({
    inferenceClient,
    prompt,
    abortSignal: signal,
    logger,
    strategy: 'next',
    input: {
      stream: {
        name: definition.name,
      },
      sample_data: JSON.stringify(truncatedAnalysis),
      ...input,
    },
    toolCallbacks: {
      get_dissect_documentation: async () => {
        return {
          dissect: dissectDocs,
        };
      },
      get_grok_documentation: async () => {
        return {
          grok: grokDocs,
        };
      },
      suggest_pipeline: async (toolCall) => {
        return await simulatePipeline(definition.name, {
          service: processing,
          samples,
          processors: toolCall.function.arguments.processors.map(({ id, config }) => {
            return {
              ...config,
              id,
            } as ProcessorDefinitionWithId;
          }),
        })
          .then(async (simulatePipelineResponse) => {
            const validities = simulatePipelineResponse.results.map((result) => result.validity);

            const overallValidity = validities.every((validity) => validity === 'success')
              ? 'success'
              : validities.some((validity) => validity === 'failure')
              ? 'failure'
              : 'partial';

            return {
              validity: overallValidity,
              results: await Promise.all(
                simulatePipelineResponse.results.map(async ({ output, ...result }, index) => {
                  const { id, ...config } = result.processor;

                  const errorsWithFixes = await Promise.all(
                    result.result.errors?.map(async ({ error, source }) => {
                      if (error.message !== `fCould only partially match pattern`) {
                        return { error, source };
                      }
                      const formatted = error as FormattedMatchFailure;

                      const messageField = castArray(getProcessorConfig(config).field)[0];

                      const { content: fix } = await inferenceClient.output({
                        id: 'describe_processor_fix',
                        input: dedent(`Explain this failure and how to fix it in two
                          sentences. Don't suggest optional fields, instead suggest
                          to widen the pattern (capture less columns).

                          > Failed to match message against pattern.
                          > \`${getProcessorType(config)}\` pattern:
                          >> \`${formatted.pattern}\`
                          > Expected:
                          >> \`${formatted.expected[0]}\`
                          > To match start of:
                          >> \`${formatted.remaining}\`
                          > Full message:
                          >> \`${source?.[messageField]}\`
                          > Matching tokens
                          >> \`${JSON.stringify(formatted.matched)}\`
                          ${
                            result.result.successful?.length
                              ? `> This message _was_ successfully parsed:
                          >> \`${result.result.successful[0]?.[messageField]}\`
                          `
                              : ''
                          }
                      `),
                        abortSignal: signal,
                      });

                      return {
                        error,
                        source,
                        suggested_fix: fix,
                      };
                    }) ?? []
                  );

                  return {
                    ...result,
                    result: {
                      ...result.result,
                      errors: errorsWithFixes,
                    },
                  };
                })
              ),
            };
          })
          .catch((error) => {
            return {
              error: format(error),
            };
          });
      },
    },
  });

  const processors = (assistantResponse?.toolCalls.flatMap((toolCall) =>
    toolCall.function.name === 'suggest_pipeline'
      ? toolCall.function.arguments.processors.map((processor) => ({
          id: processor.id,
          ...processor.config,
        }))
      : []
  ) ?? []) as ProcessorDefinitionWithId[];

  if (prompt.name === GenerateParsersPrompt.name && processors.length) {
    processors.push({
      id: v4(),
      dot_expander: {
        field: '*',
      },
    });
  }

  const { output, results } = await simulatePipeline(definition.name, {
    processors,
    samples,
    service: processing,
  });

  if (results.some((result) => result.validity === 'failure')) {
    logger.error(
      inspect(
        results.map((result) => omit(result, 'output')),
        { depth: null }
      )
    );
    throw new Error(`Failed to generate all-valid processors`);
  }

  return {
    dataset: {
      analysis: mergeSampleDocumentsWithFieldCaps({
        total,
        fieldCaps,
        hits: output,
      }),
      samples: output,
      fieldCaps,
      total,
    },
    stream: {
      ...stream,
      definition: {
        ...definition,
        ingest: {
          ...definition.ingest,
          processing: [
            ...definition.ingest.processing,
            ...processors.map(({ id, ...config }) => config),
          ],
        },
      },
    },
  };
}
