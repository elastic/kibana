/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import chalk from 'chalk';
import type { Model } from '@kbn/inference-common';
import type { EvaluationScoreRepository } from '../score_repository';
import { createTable } from './report_table';
import type { ReportDisplayOptions } from '../../types';

export type EvaluationReporter = (
  scoreRepository: EvaluationScoreRepository,
  runId: string,
  log: SomeDevLog,
  options?: { taskModelId?: string; suiteId?: string }
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
  return async (
    scoreRepository: EvaluationScoreRepository,
    runId: string,
    log: SomeDevLog,
    filter
  ) => {
    const runStats = await scoreRepository.getStatsByRunId(runId, filter);

    if (!runStats || runStats.stats.length === 0) {
      const filterSuffix = [
        filter?.taskModelId ? `task.model.id=${filter.taskModelId}` : null,
        filter?.suiteId ? `suite.id=${filter.suiteId}` : null,
      ]
        .filter(Boolean)
        .join(', ');

      log.error(
        `No evaluation results found for run ID: ${runId}${
          filterSuffix ? ` (${filterSuffix})` : ''
        }`
      );
      return;
    }

    const header = buildReportHeader(runStats.taskModel, runStats.evaluatorModel);
    const summaryTable = createTable(
      runStats.stats,
      runStats.totalRepetitions,
      options.reportDisplayOptions
    );

    log.info(`\n\n${header.join('\n')}`);
    log.info(`\n${chalk.bold.blue('═══ EVALUATION RESULTS ═══')}\n${summaryTable}`);
  };
}
