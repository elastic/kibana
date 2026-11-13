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
import { ENTERPRISE_RAG_BENCH_CORPUS } from '../../../src/regression_corpora';
import { runJudgeAnalyses } from '../../../src/regression_analyses';
import type { EnterpriseRagBenchRegressionExample } from './enterprise_rag_bench_regression_dataset';
import { ENTERPRISE_RAG_BENCH_REGRESSION_DATASET } from './enterprise_rag_bench_regression_dataset';
import { createRetrievalIrEvaluators } from './ir_evaluators';

/** The corpus indices this dataset's ground truth references. */
const getDatasetIndices = (): string[] => {
  const indices = new Set<string>();
  for (const example of ENTERPRISE_RAG_BENCH_REGRESSION_DATASET.examples) {
    for (const index of Object.keys(example.output.groundTruth)) {
      indices.add(index);
    }
  }
  return [...indices].sort();
};

evaluate.describe(
  'Agent Builder regression: enterprise-rag-bench retrieval',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ esClient, log }) => {
      await ensureRegressionCorporaRestored({
        esClient,
        log,
        suite: 'enterprise-rag-bench-regression',
        corpus: ENTERPRISE_RAG_BENCH_CORPUS,
        datasetIndices: getDatasetIndices(),
      });
    });

    evaluate(
      'enterprise-rag-bench retrieval queries',
      async ({ chatClient, evaluators, executorClient, traceEsClient, log }) => {
        const task: ExperimentTask<EnterpriseRagBenchRegressionExample, TaskOutput> = async ({
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
        // tokens, latency, tool calls). IR evaluators return null on the ambiguous
        // (info_not_found) examples, which have no ground-truth documents by design.
        const { inputTokens, outputTokens, cachedTokens, toolCalls } =
          evaluators.traceBasedEvaluators;

        await executorClient.runExperiment(
          {
            datasets: [ENTERPRISE_RAG_BENCH_REGRESSION_DATASET],
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
