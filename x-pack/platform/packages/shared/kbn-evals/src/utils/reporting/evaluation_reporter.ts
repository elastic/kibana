/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import chalk from 'chalk';
import type { EvaluationScoreRepository } from '../score_repository';
import { createTable } from './report_table';
import type { ReportDisplayOptions } from '../../types';
import { formatReportData } from '../report_model_score';
export type EvaluationReporter = (
  scoreRepository: EvaluationScoreRepository,
  runId: string,
  log: SomeDevLog
) => Promise<void>;

function buildReportHeader(model: Model, evaluatorModel: Model): string[] {
  return [
    `Model: ${model.id} (${model.family}/${model.provider})`,
    `Evaluator Model: ${evaluatorModel.id} (${evaluatorModel.family}/${evaluatorModel.provider})`,
  ];
}

export function createDefaultTerminalReporter(
  options: { reportDisplayOptions?: ReportDisplayOptions } = {}
): EvaluationReporter {
  return async (scoreRepository: EvaluationScoreRepository, runId: string, log: SomeDevLog) => {
    const docs = await scoreRepository.getScoresByRunId(runId);

    if (docs.length === 0) {
      log.error(`No evaluation results found for run ID: ${runId}`);
      return;
    }

    const report = formatReportData(docs);

    const header = buildReportHeader(report.model, report.evaluatorModel);
    const summaryTable = createTable(
      report.datasetScoresWithStats,
      report.repetitions,
      options.reportDisplayOptions
    );

    log.info(`\n\n${header.join('\n')}`);
    log.info(`\n${chalk.bold.blue('═══ EVALUATION RESULTS ═══')}\n${summaryTable}`);
  };
}
