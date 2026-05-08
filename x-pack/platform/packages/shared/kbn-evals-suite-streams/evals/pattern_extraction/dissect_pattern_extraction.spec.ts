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
  DISSECT_PATTERN_DATASETS,
  type PatternExtractionEvaluationExample,
} from './pattern_extraction_datasets';
import { runPatternExtraction } from './pattern_extraction_task';
import {
  parseRateEvaluator,
  patternQualityScoreEvaluator,
  createPatternExtractionLlmEvaluator,
} from './pattern_extraction_evaluators';

/**
 * Dissect pattern extraction quality evaluation
 *
 * Tests the quality of Dissect pattern generation using real log samples
 * and comprehensive quality metrics.
 *
 * @tags @local-stateful-classic @cloud-stateful-classic
 */

type EvaluatePatternExtraction = (opts: {
  example: PatternExtractionEvaluationExample;
  datasetName: string;
  datasetDescription: string;
}) => Promise<void>;

const evaluate = baseEvaluate.extend<{
  evaluatePatternExtraction: EvaluatePatternExtraction;
}>({
  evaluatePatternExtraction: async ({ executorClient, kbnClient, connector, evaluators }, use) => {
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
          task: () => runPatternExtraction(example, 'dissect', kbnClient, connector),
        },
        selectEvaluators([
          parseRateEvaluator,
          patternQualityScoreEvaluator,
          createPatternExtractionLlmEvaluator(evaluators),
        ])
      );
    });
  },
});

evaluate.describe.configure({ timeout: 900_000 }); // 15 minutes

evaluate.describe(
  'Dissect pattern extraction quality evaluation',
  { tag: tags.stateful.classic },
  () => {
    Object.entries(DISSECT_PATTERN_DATASETS).forEach(([_, dataset]) => {
      evaluate.describe(`Dissect: ${dataset.name}`, { tag: tags.stateful.classic }, () => {
        dataset.examples.forEach((example, idx) => {
          evaluate(
            `${idx + 1}. ${example.input.stream_name}`,
            async ({ evaluatePatternExtraction }) => {
              await evaluatePatternExtraction({
                example,
                datasetName: `Dissect - ${example.input.stream_name}`,
                datasetDescription: dataset.description,
              });
            }
          );
        });
      });
    });
  }
);
