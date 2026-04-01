/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnDatemath from '@kbn/datemath';
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
import { indexSynthtraceScenario } from '../synthtrace_helpers';

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

/**
 * Collect all index-mode examples (those that need synthtrace) across all datasets.
 * Inline-mode examples (with sample_documents) need no upfront indexing.
 */
const indexModeExamples = PIPELINE_SUGGESTION_DATASETS.flatMap((dataset) =>
  dataset.examples.filter(
    (example) => !example.input.sample_documents || example.input.sample_documents.length === 0
  )
);

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe('Pipeline suggestion quality evaluation', { tag: tags.stateful.classic }, () => {
  const from = kbnDatemath.parse('now-2m')!;
  const to = kbnDatemath.parse('now')!;

  evaluate.beforeAll(async ({ apiServices, config }) => {
    await apiServices.streams.enable();

    if (indexModeExamples.length === 0) return;

    for (const example of indexModeExamples) {
      await apiServices.streams.forkStream('logs.otel', example.input.stream_name, {
        field: 'attributes.filepath',
        eq: `${example.input.system}.log`,
      });
    }

    const allSystems = indexModeExamples.map((e) => e.input.system).join(',');

    await indexSynthtraceScenario({
      scenario: 'sample_logs',
      scenarioOpts: { systems: allSystems, rpm: 100, streamType: 'wired' },
      config,
      from,
      to,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  evaluate.afterAll(async ({ apiServices, esClient }) => {
    await apiServices.streams.disable();
    await esClient.indices.deleteDataStream({
      name: 'logs*',
    });
  });

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
