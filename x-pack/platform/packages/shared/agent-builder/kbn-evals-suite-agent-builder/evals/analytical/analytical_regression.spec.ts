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
  withEvaluatorSpan,
} from '@kbn/evals';
import type { ExperimentTask, TaskOutput } from '@kbn/evals';
import { createGcsRepository, restoreSnapshot } from '@kbn/es-snapshot-loader';
import { evaluate } from '../../src/evaluate';
import type { AnalyticalRegressionExample } from './analytical_regression_dataset';
import { ANALYTICAL_REGRESSION_DATASET } from './analytical_regression_dataset';

const CORPUS_SNAPSHOT = {
  bucket: 'agent-builder-data-science-datasets',
  basePath: 'snapshots/analytical_datasets_multi_domain',
  snapshotName: 'analytical_datasets_multi_domain',
};

// The full corpus, restored in its entirety (not just the indices the dataset queries) so
// the agent's index discovery sees the same contextual landscape as a real deployment.
const CORPUS_INDICES = [
  'customer_flight_activity',
  'customer_loyalty_history',
  'users',
  'projects',
  'invoice',
  'invoice_item',
  'project_entitlement_catalog',
  'project_entitlement_access',
  'plans',
  'plan_entitlement_access',
  'project_plan_changelogs',
  'requests_daily_count',
  'error_rate_daily',
  'support_user',
  'support_ticket',
  'customers',
  'exchange_rates',
  'products',
  'sales',
  'stores',
  'measures',
  'national_results',
  'questions',
  'reports',
  'responses',
  'state_results',
  'states',
] as const;

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
    // The expected outputs are literal values from the pinned corpus snapshot, so running
    // against a cluster without (or with a different build of) the corpus would score
    // garbage into the regression baselines. Restore what is missing; fail fast when
    // that is not possible.
    evaluate.beforeAll(async ({ esClient, log }) => {
      // Guard against dataset edits referencing an index the snapshot does not contain.
      const unknownIndices = getDatasetIndices().filter(
        (index) => !CORPUS_INDICES.includes(index as (typeof CORPUS_INDICES)[number])
      );
      if (unknownIndices.length > 0) {
        throw new Error(
          `[analytical-regression] dataset references indices not in the corpus snapshot: ${unknownIndices.join(
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
        log.info(`[analytical-regression] all ${CORPUS_INDICES.length} corpus indices present`);
        return;
      }
      if (!process.env.GCS_CREDENTIALS) {
        throw new Error(
          `[analytical-regression] corpus indices missing (${missing.join(', ')}) and ` +
            'GCS_CREDENTIALS is not set, so the snapshot cannot be restored. Load the ' +
            `"${CORPUS_SNAPSHOT.snapshotName}" snapshot or run through \`node scripts/evals start\` ` +
            'with a profile that provides GCS credentials.'
        );
      }
      log.info(
        `[analytical-regression] restoring ${missing.length} corpus indices from snapshot ` +
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
          `[analytical-regression] snapshot restore failed: ${result.errors.join('; ')}`
        );
      }
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

          // The quantitative Factuality/Relevance/Procedural Fidelity/Groundedness evaluators
          // read these analyses from the task output. Run them inside evaluator spans with
          // root context so the judge calls don't inflate the task's own trace metrics.
          const [correctnessResult, groundednessResult] = await Promise.all([
            withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
              evaluators.correctnessAnalysis().evaluate({
                input,
                expected: output,
                output: response,
                metadata,
              })
            ),
            withEvaluatorSpan('GroundednessAnalysis', {}, () =>
              evaluators.groundednessAnalysis().evaluate({
                input,
                expected: output,
                output: response,
                metadata,
              })
            ),
          ]);

          return {
            errors: response.errors,
            messages: response.messages,
            steps: response.steps,
            traceId: response.traceId,
            correctnessAnalysis: correctnessResult?.metadata,
            groundednessAnalysis: groundednessResult?.metadata,
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
