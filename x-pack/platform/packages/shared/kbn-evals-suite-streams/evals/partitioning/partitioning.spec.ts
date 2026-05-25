/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { selectEvaluators } from '@kbn/evals';
import { evaluate as baseEvaluate } from '../../src/evaluate';
import { PARTITIONING_DATASETS, type PartitioningEvaluationExample } from './partitioning_datasets';
import { runPartitionSuggestion } from './partitioning_task';
import {
  coverageEvaluator,
  overlapEvaluator,
  createPartitionQualityLlmEvaluator,
} from './partitioning_evaluators';

const MAX_PROMPT_LEN = 40;

const truncatePrompt = (prompt: string): string => {
  if (prompt.length <= MAX_PROMPT_LEN) {
    return prompt;
  }
  return `${prompt.slice(0, MAX_PROMPT_LEN)}…`;
};

type EvaluatePartitionSuggestion = (opts: {
  example: PartitioningEvaluationExample;
  datasetName: string;
  datasetDescription: string;
  exampleLabel: string;
}) => Promise<void>;

const evaluate = baseEvaluate.extend<{
  evaluatePartitionSuggestion: EvaluatePartitionSuggestion;
}>({
  evaluatePartitionSuggestion: async (
    { executorClient, kbnClient, esClient, connector, evaluators },
    use
  ) => {
    await use(async ({ example, datasetName, datasetDescription, exampleLabel }) => {
      await executorClient.runExperiment(
        {
          dataset: {
            name: `${datasetName} - ${exampleLabel}`,
            description: datasetDescription,
            examples: [
              {
                input: example.input as unknown as Record<string, unknown>,
                output: example.output as unknown as Record<string, unknown>,
                metadata: example.metadata,
              },
            ],
          },
          task: () => runPartitionSuggestion(example, kbnClient, esClient, connector),
        },
        selectEvaluators([
          coverageEvaluator,
          overlapEvaluator,
          createPartitionQualityLlmEvaluator(evaluators),
        ])
      );
    });
  },
});

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe(
  'Partitioning suggestion quality evaluation',
  { tag: tags.stateful.classic },
  () => {
    PARTITIONING_DATASETS.forEach((dataset) => {
      evaluate.describe(dataset.name, { tag: tags.stateful.classic }, () => {
        dataset.examples.forEach((example, idx) => {
          const label = example.input.user_prompt
            ? `prompt: "${truncatePrompt(example.input.user_prompt)}"`
            : example.input.existing_partitions
            ? `${example.input.existing_partitions.length} existing`
            : 'no existing';

          evaluate(`${idx + 1}. ${label}`, async ({ evaluatePartitionSuggestion }) => {
            await evaluatePartitionSuggestion({
              example,
              datasetName: dataset.name,
              datasetDescription: dataset.description,
              exampleLabel: label,
            });
          });
        });
      });
    });
  }
);
