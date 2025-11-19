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
  type EvaluationDataset,
  createQuantitativeGroundednessEvaluator,
  selectEvaluators,
} from '@kbn/evals';
import type { ExperimentTask } from '@kbn/evals/src/types';
import type { TaskOutput } from '@arizeai/phoenix-client/dist/esm/types/experiments';
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
  return async function evaluateDataset({
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

    const callConverseAndEvaluate: ExperimentTask<DatasetExample, TaskOutput> = async ({
      input,
      output,
      metadata,
    }) => {
      const response = await chatClient.converse({
        messages: [{ message: input.question }],
      });

      // Running correctness and groundedness evaluators as part of the task since their respective quantitative evaluators need their output
      const [correctnessResult, groundednessResult] = await Promise.all([
        evaluators.correctnessAnalysis().evaluate({
          input,
          expected: output,
          output: response,
          metadata,
        }),
        evaluators.groundednessAnalysis().evaluate({
          input,
          expected: output,
          output: response,
          metadata,
        }),
      ]);

      return {
        errors: response.errors,
        messages: response.messages,
        correctnessAnalysis: correctnessResult?.metadata,
        groundednessAnalysis: groundednessResult?.metadata,
      };
    };

    await phoenixClient.runExperiment(
      {
        dataset,
        task: callConverseAndEvaluate,
      },
      selectEvaluators([
        ...createQuantitativeCorrectnessEvaluators(),
        createQuantitativeGroundednessEvaluator(),
      ])
    );
  };
}
