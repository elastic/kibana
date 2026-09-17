/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { tags, selectEvaluators, getEvaluationsKbnClient } from '@kbn/evals';
import { GetEvaluationExperimentDatasetExamplesResponse } from '@kbn/evals-common';
import { getConnectorModel } from '@kbn/inference-common';
import { evaluate } from '../../src/evaluate';
import { getGoldenSourceDatasetName, readGoldenDataset } from './datasets';
import { createGoldenEvaluators } from './evaluators';
import { GOLDEN_ALERT_EVAL_CONSTRAINTS } from './prompts';
import { runGoldenInvestigation } from './task';
import type { GoldenExample, GoldenTaskOutput } from './types';

const snapshot = process.env.NIGHTSHIFT_GOLDEN_SNAPSHOT;
if (!snapshot)
  throw new Error(
    'Golden dataset setup did not produce NIGHTSHIFT_GOLDEN_SNAPSHOT. Run through scripts/evals.'
  );
const dataset = readGoldenDataset(snapshot, getGoldenSourceDatasetName());

evaluate.describe(
  'Nightshift investigations: golden Harness Parity',
  { tag: tags.stateful.classic },
  () => {
    evaluate(
      'records the investigate-lite slice with agent traces and golden scores',
      async ({
        executorClient,
        inferenceClient,
        evaluationConnector,
        connector,
        fetch,
        evaluators,
        evalsClient,
        traceEsClient,
        kbnClient,
        log,
      }) => {
        await fetch('/internal/search_inference_endpoints/settings', {
          method: 'PUT',
          headers: { 'elastic-api-version': '1' },
          body: JSON.stringify({
            features: [
              { feature_id: 'significant_events_investigation', endpoints: [{ id: connector.id }] },
            ],
          }),
        });
        const judgeConnector = await inferenceClient.getConnectorById(evaluationConnector.id);
        const experimentMetadata = {
          reasoning_mode: 'investigate',
          anti_leakage_suffix: GOLDEN_ALERT_EVAL_CONSTRAINTS,
          judge_model: getConnectorModel(judgeConnector) ?? evaluationConnector.name,
          backend: 'kbn',
          runner: 'kibana-nightshift',
          target_agent_id: 'significant-events.deductive-investigation',
          cortex_enabled: false,
          workspace_persistence: false,
          dataset: dataset.name,
          comparison: 'Harness Parity',
        };
        const selected = selectEvaluators<GoldenExample, GoldenTaskOutput>([
          ...createGoldenEvaluators(
            inferenceClient.bindTo({ connectorId: evaluationConnector.id })
          ),
          ...Object.values(evaluators.traceBasedEvaluators),
        ]).map((evaluator) => ({
          ...evaluator,
          evaluate: async (params: Parameters<typeof evaluator.evaluate>[0]) => {
            const result = await evaluator.evaluate(params);
            return {
              ...result,
              metadata: { ...result.metadata, experiment: experimentMetadata },
            };
          },
        }));
        const [experiment] = await executorClient.runExperiment(
          {
            name: 'Nightshift golden Harness Parity',
            datasets: [dataset],
            concurrency: 2,
            metadata: experimentMetadata,
            task: (example) => runGoldenInvestigation(fetch, example),
          },
          selected
        );
        await expect
          .poll(async () => (await evalsClient.getExperimentScores(experiment.id)).length, {
            timeout: 60_000,
          })
          .toBe(Object.keys(experiment.runs).length * selected.length);
        const evaluationsKbn = getEvaluationsKbnClient({ kbnClient, log });
        // Bulk score summaries omit task output and metadata; the dataset detail route retains them.
        const detailedScores = await evaluationsKbn.request({
          path: `/internal/evals/experiments/${encodeURIComponent(
            experiment.id
          )}/datasets/${encodeURIComponent(experiment.datasetId)}/examples`,
          method: 'GET',
          headers: { 'elastic-api-version': '1' },
        });
        const scores = GetEvaluationExperimentDatasetExamplesResponse.parse(
          detailedScores.data
        ).examples.flatMap((example) => example.scores);
        for (const run of Object.values(experiment.runs)) {
          const output = run.output as GoldenTaskOutput;
          const exampleScores = scores.filter(
            (score) =>
              score.example.index === run.exampleIndex &&
              score.task.repetition_index === run.repetition
          );
          expect(exampleScores.map(({ evaluator }) => evaluator.name).sort()).toEqual(
            selected.map(({ name }) => name).sort()
          );
          for (const score of exampleScores) {
            expect(score.task.trace_id).toBe(output.traceId);
            expect(score.example.metadata).toMatchObject({
              langsmith_example_id: expect.any(String),
              source_kbn_example_id: expect.any(String),
            });
            expect(score.evaluator.metadata?.experiment).toEqual(experimentMetadata);
            if (score.evaluator.name === 'cost_usd') expect(score.evaluator.score).toBeNull();
            if (
              [
                'goal_pass',
                'rca_mechanism_class',
                'rca_timeline_ok',
                'rca_signal_coverage',
                'rca_cause_completeness',
                'rca_hypothesis_focus',
                'rca_evidence_quality',
              ].includes(score.evaluator.name)
            ) {
              expect(score.evaluator.score).toEqual(expect.any(Number));
            }
          }
          expect(output.execution_error).toBeNull();
          expect(run.traceId).toBe(output.traceId);
          expect(output.traceId).toMatch(/^[a-f0-9]{32}$/);
          for (const field of [
            'gen_ai.input.messages',
            'gen_ai.output.messages',
            'gen_ai.system_instructions',
            'gen_ai.tool.call.arguments',
            'gen_ai.tool.call.result',
            'gen_ai.conversation.id',
          ]) {
            await expect
              .poll(
                async () =>
                  (
                    await traceEsClient.count({
                      index: 'traces-*',
                      query: {
                        bool: {
                          filter: [
                            { term: { 'trace.id': output.traceId } },
                            { exists: { field: `attributes.${field}` } },
                          ],
                        },
                      },
                    })
                  ).count,
                { timeout: 60_000 }
              )
              .toBeGreaterThan(0);
          }
        }
      }
    );
  }
);
