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
import { BROWSECOMP_PLUS_CORPUS } from '../../../src/regression_corpora';
import { runJudgeAnalyses } from '../../../src/regression_analyses';
import type { BrowsecompPlusRegressionExample } from './browsecomp_plus_regression_dataset';
import { BROWSECOMP_PLUS_REGRESSION_DATASET } from './browsecomp_plus_regression_dataset';
import { createRetrievalIrEvaluators } from './ir_evaluators';

/** The corpus indices this dataset's ground truth references. */
const getDatasetIndices = (): string[] => {
  const indices = new Set<string>();
  for (const example of BROWSECOMP_PLUS_REGRESSION_DATASET.examples) {
    for (const index of Object.keys(example.output.groundTruth)) {
      indices.add(index);
    }
  }
  return [...indices].sort();
};

evaluate.describe(
  'Agent Builder regression: browsecomp-plus retrieval',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ esClient, log }) => {
      await ensureRegressionCorporaRestored({
        esClient,
        log,
        suite: 'browsecomp-plus-regression',
        corpus: BROWSECOMP_PLUS_CORPUS,
        datasetIndices: getDatasetIndices(),
      });
    });

    evaluate(
      'browsecomp-plus retrieval queries',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        const task: ExperimentTask<BrowsecompPlusRegressionExample, TaskOutput> = async ({
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
        // runs, so this list must stay stable (correctness family, groundedness, IR@10,
        // tokens, latency, tool calls).
        const { inputTokens, outputTokens, cachedTokens, toolCalls } =
          evaluators.traceBasedEvaluators;

        await executorClient.runExperiment(
          {
            datasets: [BROWSECOMP_PLUS_REGRESSION_DATASET],
            task,
          },
          [
            ...createQuantitativeCorrectnessEvaluators(),
            createQuantitativeGroundednessEvaluator(),
            ...createRetrievalIrEvaluators(),
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
