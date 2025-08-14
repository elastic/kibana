/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import {
  CorrectnessAnalysis,
  DefaultEvaluators,
  KibanaPhoenixClient,
  calculateFactualScore,
  calculateProceduralFidelityScore,
  calculateRelevanceScore,
} from '@kbn/evals';
import { EvaluationDataset } from '@kbn/evals/src/types';
import { OnechatEvaluationChatClient } from './chat_client';

interface DatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string;
  };
}

export type EvaluateDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: DatasetExample[];
  };
}) => Promise<void>;

export function createEvaluateDataset({
  evaluators,
  phoenixClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: OnechatEvaluationChatClient;
}): EvaluateDataset {
  return async function evaluateEsqlDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    await phoenixClient.runExperiment(
      {
        dataset,
        task: async ({ input, output, metadata }) => {
          const response = await chatClient.converse({
            messages: input.question,
          });

          // Running correctness evaluator as part of the experiment task since quantitative correctness calculations need its output
          let correctnessAnalysis = null;
          if (!response.errors?.length) {
            const correctnessResult = await evaluators.corectness().evaluate({
              input,
              expected: output,
              output: response,
              metadata,
            });
            correctnessAnalysis = correctnessResult.metadata as unknown as CorrectnessAnalysis;
          }

          return {
            errors: response.errors,
            messages: response.messages,
            correctnessAnalysis,
          };
        },
      },
      [
        {
          name: 'response-evaluator',
          kind: 'LLM',
          evaluate: async ({ input, output, expected, metadata }) => {
            const result = await evaluators
              .criteria([`The response contains the following information: ${expected.expected}`])
              .evaluate({
                input,
                expected,
                output,
                metadata,
              });

            return result;
          },
        },
        {
          name: 'factuality',
          kind: 'LLM',
          evaluate: async ({ output, metadata }) => {
            if (!output.correctnessAnalysis) {
              return {
                score: null,
                label: 'unavailable',
                explanation: 'No correctness analysis available',
                metadata,
              };
            }

            const correctnessAnalysis = output.correctnessAnalysis as CorrectnessAnalysis;
            const score = calculateFactualScore(correctnessAnalysis);
            return {
              score,
              label: correctnessAnalysis.summary.factual_accuracy_summary,
              explanation: correctnessAnalysis.analysis.join(', '),
              metadata,
            };
          },
        },
        {
          name: 'relevance',
          kind: 'LLM',
          evaluate: async ({ output, metadata }) => {
            if (!output.correctnessAnalysis) {
              return {
                score: null,
                label: 'unavailable',
                explanation: 'No correctness analysis available',
                metadata,
              };
            }

            const correctnessAnalysis = output.correctnessAnalysis as CorrectnessAnalysis;
            const score = calculateRelevanceScore(correctnessAnalysis);

            return {
              score,
              label: correctnessAnalysis.summary.relevance_summary,
              explanation: correctnessAnalysis.analysis.join(', '),
              metadata,
            };
          },
        },
        {
          name: 'sequence-accuracy',
          kind: 'LLM',
          evaluate: async ({ output, metadata }) => {
            if (!output.correctnessAnalysis) {
              return {
                score: null,
                label: 'unavailable',
                explanation: 'No correctness analysis available',
                metadata,
              };
            }

            const correctnessAnalysis = output.correctnessAnalysis as CorrectnessAnalysis;
            const score = calculateProceduralFidelityScore(correctnessAnalysis);

            return {
              score,
              label: correctnessAnalysis.summary.sequence_accuracy_summary,
              explanation: correctnessAnalysis.analysis.join(', '),
              metadata,
            };
          },
        },
      ]
    );
  };
}
