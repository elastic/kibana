/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import {
  createQuantitativeCorrectnessEvaluators,
  type DefaultEvaluators,
  type KibanaPhoenixClient,
} from '@kbn/evals';
import type { EvaluationDataset } from '@kbn/evals/src/types';
import type { OnechatEvaluationChatClient } from './chat_client';

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

          // Running correctness evaluator as part of the task since quantitative correctness evaluators need its output
          let correctnessAnalysis = null;
          if (!response.errors?.length) {
            const correctnessResult = await evaluators.correctnessAnalysis().evaluate({
              input,
              expected: output,
              output: response,
              metadata,
            });
            correctnessAnalysis = correctnessResult.metadata;
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
          name: 'Criteria',
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
        ...createQuantitativeCorrectnessEvaluators(),
      ]
    );
  };
}
