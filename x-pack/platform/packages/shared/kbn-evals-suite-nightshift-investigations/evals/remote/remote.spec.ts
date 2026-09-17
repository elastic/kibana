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
import { createGoldenEvaluators } from '../golden/evaluators';
import { runGoldenInvestigation } from '../golden/task';
import type { InvestigationExample, GoldenTaskOutput } from '../golden/types';
import { readRemoteDataset, resolveRemoteExamplesFile } from './datasets';
import { ELASTIC_INVESTIGATION_EVAL_CONSTRAINTS } from './prompts';

const dataset = readRemoteDataset(resolveRemoteExamplesFile());

/**
 * Capability Baseline: the same task and graders as the golden eval, but the investigator's
 * sandbox reads a remote telemetry cluster the operator connected, and the examples come from a
 * local labels-only file. The first score is the deliverable; there is no minimum.
 */
evaluate.describe(
  'Nightshift investigations: remote telemetry Capability Baseline',
  { tag: tags.stateful.classic },
  () => {
    evaluate(
      'investigates operator-labelled incidents against the remote cluster',
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
          anti_leakage_suffix: ELASTIC_INVESTIGATION_EVAL_CONSTRAINTS,
          judge_model: getConnectorModel(judgeConnector) ?? evaluationConnector.name,
          backend: 'kbn',
          runner: 'kibana-nightshift',
          target_agent_id: 'significant-events.deductive-investigation',
          cortex_enabled: false,
          workspace_persistence: false,
          dataset: dataset.name,
          comparison: 'Capability Baseline',
          telemetry_source: 'remote',
        };
        const selected = selectEvaluators<InvestigationExample, GoldenTaskOutput>([
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
            name: 'Nightshift remote telemetry Capability Baseline',
            datasets: [dataset],
            concurrency: 2,
            metadata: experimentMetadata,
            task: (example) =>
              runGoldenInvestigation(fetch, example, ELASTIC_INVESTIGATION_EVAL_CONSTRAINTS),
          },
          selected
        );
        await expect
          .poll(async () => (await evalsClient.getExperimentScores(experiment.id)).length, {
            timeout: 60_000,
          })
          .toBe(Object.keys(experiment.runs).length * selected.length);
        const evaluationsKbn = getEvaluationsKbnClient({ kbnClient, log });
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
          // The investigator must have actually reached the remote cluster: at least one sandbox
          // command asked for the telemetry connector and returned without a tool error.
          const remoteQueries = output.trajectory.filter(
            (step, index) =>
              step.step_type === 'tool_call' &&
              typeof step.tool_args?.connector_id === 'string' &&
              output.trajectory[index + 1]?.step_type === 'tool_result' &&
              output.trajectory[index + 1]?.success
          );
          expect(remoteQueries.length).toBeGreaterThan(0);
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
