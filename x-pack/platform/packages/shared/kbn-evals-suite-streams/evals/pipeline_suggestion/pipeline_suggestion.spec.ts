/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { selectEvaluators } from '@kbn/evals';
import { evaluate as baseEvaluate } from '../../src/evaluate';
import {
  PIPELINE_SUGGESTION_DATASETS,
  type PipelineSuggestionEvaluationExample,
} from './pipeline_suggestion_datasets';
import { runPipelineSuggestion } from './pipeline_suggestion_task';
import {
  pipelineQualityScoreEvaluator,
  createPipelineSuggestionLlmEvaluator,
} from './pipeline_suggestion_evaluators';

/**
 * Pipeline suggestion quality evaluation.
 *
 * Tests the quality of complete pipeline generation (parsing + normalization)
 * using real LogHub log samples.
 *
 * @tags @local-stateful-classic @cloud-stateful-classic
 */

type EvaluatePipelineSuggestion = (opts: {
  example: PipelineSuggestionEvaluationExample;
  datasetName: string;
  datasetDescription: string;
}) => Promise<void>;

const evaluate = baseEvaluate.extend<{
  evaluatePipelineSuggestion: EvaluatePipelineSuggestion;
}>({
  evaluatePipelineSuggestion: async (
    { executorClient, kbnClient, esClient, connector, evaluators },
    use
  ) => {
    await use(async ({ example, datasetName, datasetDescription }) => {
      await executorClient.runExperiment(
        {
          dataset: {
            name: datasetName,
            description: datasetDescription,
            examples: [
              {
                input: example.input,
                output: example.output as unknown as Record<string, unknown>,
                metadata: example.metadata,
              },
            ],
          },
          task: () => runPipelineSuggestion(example, kbnClient, esClient, connector),
        },
        selectEvaluators([
          pipelineQualityScoreEvaluator,
          createPipelineSuggestionLlmEvaluator(evaluators),
        ])
      );
    });
  },
});

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe('Pipeline suggestion quality evaluation', { tag: tags.stateful.classic }, () => {
  PIPELINE_SUGGESTION_DATASETS.forEach((dataset) => {
    evaluate.describe(dataset.name, { tag: tags.stateful.classic }, () => {
      dataset.examples.forEach((example, idx) => {
        evaluate(`${idx + 1}. ${example.input.system}`, async ({ evaluatePipelineSuggestion }) => {
          const isInlineMode =
            example.input.sample_documents && example.input.sample_documents.length > 0;

          const evaluationExample = isInlineMode
            ? { ...example, input: { ...example.input, stream_name: 'logs.otel' } }
            : example;

          await evaluatePipelineSuggestion({
            example: evaluationExample,
            datasetName: `Pipeline Suggestion - ${example.input.system}`,
            datasetDescription: dataset.description,
          });
        });
      });
    });
  });
});
