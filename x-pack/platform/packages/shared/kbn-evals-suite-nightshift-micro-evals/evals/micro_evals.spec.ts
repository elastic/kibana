/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import { expect } from '@playwright/test';
import { tags, type EvaluationDataset, type Evaluator, type Example } from '@kbn/evals';
import { getJudgeModel } from '../src/get_judge_model';
import { evaluate } from '../src/evaluate';
import type { PassingRule } from '../src/rules';
import {
  readDataset as readMonitor,
  SPLITS as monitorSplits,
} from './monitor_id_extraction/datasets';
import { codeEvaluators as monitorEvaluators } from './monitor_id_extraction/evaluators';
import { runTask as monitorTask } from './monitor_id_extraction/task';
import { rules as monitorRules } from './monitor_id_extraction/rules';
import { readDataset as readExtraction, getPlanExtractionSplit } from './plan_extraction/datasets';
import { createEvaluators as extractionEvaluators } from './plan_extraction/evaluators';
import { runTask as extractionTask } from './plan_extraction/task';
import { rules as extractionRules } from './plan_extraction/rules';
import { readDataset as readMerge, SPLITS as mergeSplits } from './plan_merge/datasets';
import { createEvaluators as mergeEvaluators } from './plan_merge/evaluators';
import { runTask as mergeTask } from './plan_merge/task';
import { rules as mergeRules } from './plan_merge/rules';

const directory = process.env.NIGHTSHIFT_MICRO_SNAPSHOT_DIR;
if (!directory)
  throw new Error('Micro-eval setup did not produce dataset snapshots. Run through scripts/evals.');
const monitor = readMonitor(join(directory, 'monitor_id_extraction.json'));
const extractionSplit = getPlanExtractionSplit();
const extraction = readExtraction(join(directory, 'plan_extraction.json'), extractionSplit);
const merge = readMerge(join(directory, 'plan_merge.json'));

evaluate.describe('Nightshift Micro Evals', { tag: tags.stateful.classic }, () => {
  evaluate(
    'runs all three Reference Targets and reports every Passing Rule',
    async ({
      executorClient,
      inferenceClient,
      connector,
      evaluationConnector,
      evalsClient,
      microExperiments,
    }) => {
      const target = inferenceClient.bindTo({ connectorId: connector.id });
      const judge = inferenceClient.bindTo({ connectorId: evaluationConnector.id });
      const judgeModel = await getJudgeModel(inferenceClient, evaluationConnector);

      const run = async <TExample extends Example, TOutput>({
        taskType,
        dataset,
        split,
        rules,
        concurrency,
        task,
        evaluators,
      }: {
        taskType: string;
        dataset: EvaluationDataset<TExample>;
        split: readonly string[];
        rules: readonly PassingRule[];
        concurrency: number;
        task: (example: TExample) => Promise<TOutput>;
        evaluators: Array<Evaluator<TExample, TOutput>>;
      }): Promise<void> => {
        const experimentMetadata = {
          task_type: taskType,
          target: 'reference-prompt',
          prompt_source_commit: 'a60f80265f5ebe5c4ce9be02b0a158be00e2d58c',
          judge_model: judgeModel,
          backend: 'kbn',
          runner: 'kibana-nightshift',
          dataset: dataset.name,
          split: split.join(' AND '),
          rules,
        };
        const selected = evaluators.map(
          (evaluator): Evaluator<TExample, TOutput> => ({
            ...evaluator,
            evaluate: async (params) => {
              const result = await evaluator.evaluate(params);
              return {
                ...result,
                metadata: { ...result.metadata, experiment: experimentMetadata },
              };
            },
          })
        );
        const [result] = await executorClient.runExperiment(
          {
            name: `Nightshift Micro Eval: ${taskType}`,
            datasets: [dataset],
            concurrency,
            task,
            metadata: experimentMetadata,
          },
          selected
        );
        microExperiments.push({ taskType, rules, result });
        // Score refresh is asynchronous; acceptance checks ingestion, never Passing Rules.
        await expect
          .poll(async () => (await evalsClient.getExperimentScores(result.id)).length, {
            timeout: 60_000,
          })
          .toBe(Object.keys(result.runs).length * selected.length);
        const scores = await evalsClient.getExperimentScores(result.id);
        for (const runResult of Object.values(result.runs)) {
          expect(
            scores
              .filter(
                (score) =>
                  score.example.index === runResult.exampleIndex &&
                  score.task.repetition_index === runResult.repetition
              )
              .map(({ evaluator }) => evaluator.name)
              .sort()
          ).toEqual(selected.map(({ name }) => name).sort());
        }
      };

      await run({
        taskType: 'MonitorIdExtraction',
        dataset: monitor,
        split: monitorSplits,
        rules: monitorRules,
        concurrency: 4,
        task: ({ input }) => monitorTask(target, input),
        evaluators: monitorEvaluators,
      });
      await run({
        taskType: 'PlanExtraction',
        dataset: extraction,
        split: [extractionSplit],
        rules: extractionRules,
        concurrency: 4,
        task: ({ input }) => extractionTask(target, input),
        evaluators: extractionEvaluators(judge),
      });
      await run({
        taskType: 'PlanMerge',
        dataset: merge,
        split: mergeSplits,
        rules: mergeRules,
        concurrency: 2,
        task: ({ input }) => mergeTask(target, input),
        evaluators: mergeEvaluators(judge),
      });
    }
  );
});
