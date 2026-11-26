/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { buildModelFromConnector, evaluate, tags } from '@kbn/evals';
import {
  ARM_ID,
  EVALUATOR_NAME,
  INDEX_SCHEMA_VERSION,
  PROMPT_VERSION,
  SELECTED_EXAMPLE_IDS,
  SUITE_VERSION,
} from '../src/longmemeval/constants';
import { loadLongMemEvalSuiteData, resolveSelectedIds } from '../src/longmemeval/dataset';
import {
  createEvidenceSessionRecallEvaluator,
  createLongMemEvalAnswerAccuracyEvaluator,
  createUsedEsqlEvaluator,
} from '../src/longmemeval/evaluators';
import {
  assertPocIndexSearchable,
  deletePocIndex,
  isPocIndexPresent,
} from '../src/longmemeval/index_store';
import { assessRun } from '../src/longmemeval/run_checks';
import type { PersistedScoreLike } from '../src/longmemeval/run_checks';
import { createLongMemEvalTask } from '../src/longmemeval/task';

const SCORE_READ_BACK_ATTEMPTS = 12;
const SCORE_READ_BACK_INTERVAL_MS = 5_000;

evaluate.describe(
  'Context Engine Memory: LongMemEval-S direct index',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ esClient }) => {
      await deletePocIndex(esClient);
    });

    evaluate.afterAll(async ({ esClient }) => {
      await deletePocIndex(esClient);
    });

    evaluate(
      'answers LongMemEval-S questions from a directly indexed history',
      async ({
        agentBuilderClient,
        esClient,
        evalsClient,
        evaluationConnector,
        executorClient,
        inferenceClient,
        log,
      }) => {
        const selectedIds = resolveSelectedIds(SELECTED_EXAMPLE_IDS);
        const { dataset, histories } = await loadLongMemEvalSuiteData({ log, selectedIds });

        const firstHistory = histories.get(selectedIds[0]);
        if (!firstHistory) {
          throw new Error(`No history loaded for ${selectedIds[0]}.`);
        }
        await assertPocIndexSearchable(esClient, firstHistory);

        const judgeInferenceClient = inferenceClient.bindTo({
          connectorId: evaluationConnector.id,
        });

        const [result] = await executorClient.runExperiment(
          {
            datasets: [dataset],
            task: createLongMemEvalTask({
              agentBuilderClient,
              agentId: agentBuilderDefaultAgentId,
              esClient,
              histories,
              log,
            }),
            // Every example replaces the single POC index, so examples must not overlap.
            concurrency: 1,
            metadata: {
              suiteVersion: SUITE_VERSION,
              promptVersion: PROMPT_VERSION,
              indexSchemaVersion: INDEX_SCHEMA_VERSION,
              armId: ARM_ID,
              agentId: agentBuilderDefaultAgentId,
            },
          },
          [
            createLongMemEvalAnswerAccuracyEvaluator({
              inferenceClient: judgeInferenceClient,
              evaluationConnector,
              log,
            }),
            createEvidenceSessionRecallEvaluator(),
            createUsedEsqlEvaluator(),
          ]
        );

        // Score export only logs a warning on failure, so read the scores back.
        let persistedScores: PersistedScoreLike[] = [];
        for (let attempt = 1; attempt <= SCORE_READ_BACK_ATTEMPTS; attempt++) {
          persistedScores = await evalsClient.getExperimentScores(result.id);
          const scored = persistedScores.filter(
            ({ evaluator }) =>
              evaluator.name === EVALUATOR_NAME && typeof evaluator.score === 'number'
          );
          if (scored.length >= selectedIds.length) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, SCORE_READ_BACK_INTERVAL_MS));
        }

        const assessment = assessRun({
          selectedIds,
          runs: Object.values(result.runs),
          evaluationRuns: result.evaluationRuns,
          persistedScores,
          judgeModelId: buildModelFromConnector(evaluationConnector).id,
        });
        log.info(
          `LongMemEval coverage: ${assessment.validTaskOutputs}/${assessment.selected} valid (${assessment.coveragePct}%), ${assessment.scored} judged, ${assessment.persistedScored} persisted; experiment ${result.id}`
        );
        for (const run of Object.values(result.runs)) {
          log.info(
            `LongMemEval run ${JSON.stringify({
              id: run.metadata?.externalId,
              output: run.output,
            })}`
          );
        }

        expect(assessment.problems).toEqual([]);
        expect(await isPocIndexPresent(esClient)).toBe(false);
      }
    );
  }
);
