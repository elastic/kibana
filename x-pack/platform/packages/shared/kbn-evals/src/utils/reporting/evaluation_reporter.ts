/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import chalk from 'chalk';
import type { Model } from '@kbn/evals-common';
import type { EvalsClient } from '../evals_client';
import { createTable } from './report_table';
import type { ReportDisplayOptions } from '../../types';

export type EvaluationReporter = (
  evalsClient: EvalsClient,
  experimentId: string,
  log: SomeDevLog,
  options?: { taskModelId?: string; suiteId?: string; executionId?: string }
) => Promise<void>;

function buildReportHeader(taskModel: Model, evaluatorModel: Model): string[] {
  const lines = [`Model: ${taskModel.id} (${taskModel.family}/${taskModel.provider})`];
  lines.push(
    `Evaluator Model: ${evaluatorModel.id} (${evaluatorModel.family}/${evaluatorModel.provider})`
  );
  return lines;
}

export function createDefaultTerminalReporter(
  options: { reportDisplayOptions?: ReportDisplayOptions } = {}
): EvaluationReporter {
  return async (evalsClient: EvalsClient, experimentId: string, log: SomeDevLog, filter) => {
    const experimentStats = await evalsClient.getExperimentStats(experimentId, filter);

    if (!experimentStats || experimentStats.stats.length === 0) {
      const filterSuffix = [
        filter?.taskModelId ? `task.model.id=${filter.taskModelId}` : null,
        filter?.suiteId ? `metadata.suite_id=${filter.suiteId}` : null,
      ]
        .filter(Boolean)
        .join(', ');

      log.error(
        `No evaluation results found for experiment ID: ${experimentId}${
          filterSuffix ? ` (${filterSuffix})` : ''
        }`
      );
      return;
    }

    const header = buildReportHeader(experimentStats.taskModel, experimentStats.evaluatorModel);
    const summaryTable = createTable(
      experimentStats.stats,
      experimentStats.totalRepetitions,
      options.reportDisplayOptions
    );

    log.info(`\n\n${header.join('\n')}`);
    log.info(`\n${chalk.bold.blue('═══ EVALUATION RESULTS ═══')}\n${summaryTable}`);
  };
}
