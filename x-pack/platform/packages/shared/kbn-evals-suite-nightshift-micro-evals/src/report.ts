/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createDefaultTerminalReporter,
  type EvaluationReporter,
  type DatasetRunResult,
  type ReportDisplayOptions,
} from '@kbn/evals';
import { pythonFormat } from './python';
import type { PassingRule } from './rules';

export interface MicroExperiment {
  taskType: string;
  rules: readonly PassingRule[];
  result: DatasetRunResult;
}

/** Formats the driver's AND-joined rules without asserting on their verdict. */
export const formatRuleSummary = (
  task: string,
  rules: readonly PassingRule[],
  means: Record<string, number>,
  allErrored: boolean
): string[] => {
  let passed = true;
  const lines = rules.map(({ metric, op, threshold }) => {
    if (!Object.hasOwn(means, metric)) {
      passed = false;
      return `${metric}: MISSING (no evaluator produced this metric) FAIL`;
    }
    const score = means[metric];
    const rulePassed = score >= threshold;
    passed = passed && rulePassed;
    return `${metric}=${pythonFormat(score, 3)} ${op} ${threshold} ${rulePassed ? 'PASS' : 'FAIL'}`;
  });
  if (allErrored) lines.push('WARNING: every example errored; check the model/connector wiring.');
  lines.push(`MICRO_EVAL_RESULT: ${task} — ${passed ? 'PASS' : 'FAIL'}`);
  return lines;
};

/** Reports each task separately so shared evaluator names never collapse into one mean. */
export const createMicroReporter = ({
  experiments,
  resultsUrl,
  reportDisplayOptions,
}: {
  experiments: MicroExperiment[];
  resultsUrl: string;
  reportDisplayOptions?: ReportDisplayOptions;
}): EvaluationReporter => {
  const defaultReporter = createDefaultTerminalReporter({ reportDisplayOptions });
  return async (evalsClient, _experimentId, log, filter) => {
    for (const { taskType, rules, result } of experiments) {
      // executionId spans all three tasks; querying by experiment ID keeps their means separate.
      const options = { taskModelId: filter?.taskModelId, suiteId: filter?.suiteId };
      await defaultReporter(evalsClient, result.id, log, options);
      const stats = await evalsClient.getExperimentStats(result.id, options);
      const means = Object.fromEntries(
        (stats?.stats ?? [])
          .filter(({ datasetId }) => datasetId === result.datasetId)
          .map(({ evaluatorName, stats: metricStats }) => [evaluatorName, metricStats.mean])
      );
      const url = new URL(resultsUrl);
      url.username = '';
      url.password = '';
      url.pathname = `${url.pathname.replace(
        /\/$/,
        ''
      )}/app/management/ai/evals/experiments/${encodeURIComponent(result.id)}`;
      url.search = '';
      url.hash = '';
      log.info(`KBN_EXPERIMENT_URL: ${url.toString()}`);
      const runs = Object.values(result.runs);
      const allErrored =
        runs.length > 0 &&
        runs.every(
          ({ output }) =>
            typeof output === 'object' &&
            output !== null &&
            'error' in output &&
            Boolean(output.error)
        );
      for (const line of formatRuleSummary(taskType, rules, means, allErrored)) log.info(line);
    }
  };
};
