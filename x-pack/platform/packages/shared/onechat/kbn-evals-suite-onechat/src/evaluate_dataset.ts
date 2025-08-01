/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import { DefaultEvaluators, KibanaPhoenixClient } from '@kbn/evals';
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
        task: async ({ input }) => {
          const response = await chatClient.converse({
            messages: input.question,
          });

          return {
            errors: response.errors,
            messages: response.messages,
          };
        },
      },
      [
        // Simple, generic response evaluator until more specific evaluators are implemented
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
      ]
    );
  };
}
