/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
  createSpanLatencyEvaluator,
} from '@kbn/evals';
import type { ExperimentTask, TaskOutput } from '@kbn/evals';
import { evaluate } from '../../../src/evaluate';
import { ensureRegressionCorporaRestored } from '../../../src/ensure_corpus_restored';
import { ANALYTICAL_CORPUS } from '../../../src/regression_corpora';
import { runJudgeAnalyses } from '../../../src/regression_analyses';
import type { AnalyticalRegressionExample } from './analytical_regression_dataset';
import { ANALYTICAL_REGRESSION_DATASET } from './analytical_regression_dataset';

/** The corpus indices this dataset queries, derived from its reference ES|QL. */
const getDatasetIndices = (): string[] => {
  const indices = new Set<string>();
  for (const example of ANALYTICAL_REGRESSION_DATASET.examples) {
    for (const query of example.output.esqlQueries) {
      for (const match of query.matchAll(/FROM ([a-zA-Z_0-9]+)/g)) {
        indices.add(match[1]);
      }
    }
  }
  return [...indices].sort();
};

evaluate.describe(
  'Agent Builder regression: analytical queries',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ esClient, log }) => {
      await ensureRegressionCorporaRestored({
        esClient,
        log,
        suite: 'analytical-regression',
        corpus: ANALYTICAL_CORPUS,
        datasetIndices: getDatasetIndices(),
      });
    });

    evaluate(
      'analytical queries',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        const task: ExperimentTask<AnalyticalRegressionExample, TaskOutput> = async ({
          input,
          output,
          metadata,
        }) => {
          const response = await chatClient.converse({
            messages: [{ message: input.question }],
          });

          const { correctnessAnalysis, groundednessAnalysis, analysisErrors } =
            await runJudgeAnalyses({
              evaluators,
              input,
              expected: output,
              response,
              metadata,
              log,
            });

          return {
            errors: [...response.errors, ...analysisErrors],
            messages: response.messages,
            steps: response.steps,
            traceId: response.traceId,
            correctnessAnalysis,
            groundednessAnalysis,
          };
        };

        // Fixed evaluator set — the regression gates pair scores by evaluator name across
        // runs, so this list must stay stable (correctness family, groundedness, tokens,
        // latency, tool calls).
        const { inputTokens, outputTokens, cachedTokens, toolCalls } =
          evaluators.traceBasedEvaluators;

        await executorClient.runExperiment(
          {
            datasets: [ANALYTICAL_REGRESSION_DATASET],
            task,
          },
          [
            ...createQuantitativeCorrectnessEvaluators(),
            createQuantitativeGroundednessEvaluator(),
            inputTokens,
            outputTokens,
            cachedTokens,
            toolCalls,
            createSpanLatencyEvaluator({
              traceEsClient,
              log,
              spanNamePattern: 'invoke_agent*',
            }),
          ]
        );
      }
    );
  }
);
