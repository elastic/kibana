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
import { createGcsRepository, restoreSnapshot } from '@kbn/es-snapshot-loader';
import { evaluate } from '../../../src/evaluate';
import { runJudgeAnalyses } from '../../../src/regression_analyses';
import type { EnterpriseRagBenchRegressionExample } from './enterprise_rag_bench_regression_dataset';
import { ENTERPRISE_RAG_BENCH_REGRESSION_DATASET } from './enterprise_rag_bench_regression_dataset';
import { createRetrievalIrEvaluators } from './ir_evaluators';

const CORPUS_SNAPSHOT = {
  bucket: 'agent-builder-data-science-datasets',
  basePath: 'snapshots/enterprise_rag_bench',
  snapshotName: 'enterprise_rag_bench_documents_semantic',
};

// The full Redwood Inference workspace — all 9 source indices, restored in their
// entirety so the agent's index discovery sees the same landscape as a real deployment
// (questions may require picking the right source among look-alikes).
const CORPUS_INDICES = [
  'enterprise_rag_bench_slack_documents_semantic',
  'enterprise_rag_bench_gmail_documents_semantic',
  'enterprise_rag_bench_linear_documents_semantic',
  'enterprise_rag_bench_google_drive_documents_semantic',
  'enterprise_rag_bench_hubspot_documents_semantic',
  'enterprise_rag_bench_fireflies_documents_semantic',
  'enterprise_rag_bench_github_documents_semantic',
  'enterprise_rag_bench_jira_documents_semantic',
  'enterprise_rag_bench_confluence_documents_semantic',
] as const;

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
    // The ground-truth doc ids are literal `_id`s from the pinned corpus snapshot, so
    // running against a cluster without (or with a different build of) the corpus would
    // score garbage into the regression baselines. Restore what is missing; fail fast
    // when that is not possible.
    evaluate.beforeAll(async ({ esClient, log }) => {
      const unknownIndices = getDatasetIndices().filter(
        (index) => !CORPUS_INDICES.includes(index as (typeof CORPUS_INDICES)[number])
      );
      if (unknownIndices.length > 0) {
        throw new Error(
          `[enterprise-rag-bench-regression] dataset references indices not in the corpus snapshot: ${unknownIndices.join(
            ', '
          )}`
        );
      }

      const missing: string[] = [];
      for (const index of CORPUS_INDICES) {
        if (!(await esClient.indices.exists({ index }))) {
          missing.push(index);
        }
      }
      if (missing.length === 0) {
        log.info(
          `[enterprise-rag-bench-regression] all ${CORPUS_INDICES.length} corpus indices present`
        );
        return;
      }
      if (!process.env.GCS_CREDENTIALS) {
        throw new Error(
          `[enterprise-rag-bench-regression] corpus indices missing (${missing.join(', ')}) and ` +
            'GCS_CREDENTIALS is not set, so the snapshot cannot be restored. Load the ' +
            `"${CORPUS_SNAPSHOT.snapshotName}" snapshot or run through \`node scripts/evals start\` ` +
            'with a profile that provides GCS credentials.'
        );
      }
      log.info(
        `[enterprise-rag-bench-regression] restoring ${missing.length} corpus indices from snapshot ` +
          `"${CORPUS_SNAPSHOT.snapshotName}"`
      );
      const result = await restoreSnapshot({
        esClient,
        log,
        repository: createGcsRepository({
          bucket: CORPUS_SNAPSHOT.bucket,
          basePath: CORPUS_SNAPSHOT.basePath,
        }),
        snapshotName: CORPUS_SNAPSHOT.snapshotName,
        indices: missing,
      });
      if (!result.success) {
        throw new Error(
          `[enterprise-rag-bench-regression] snapshot restore failed: ${result.errors.join('; ')}`
        );
      }
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
