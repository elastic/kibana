/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import type { RanExperiment } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type { Client as EsClient } from '@elastic/elasticsearch';
import chalk from 'chalk';
import { hostname } from 'os';
import type { KibanaPhoenixClient } from '../kibana_phoenix_client/client';
import {
  EvaluationScoreRepository,
  type EvaluationScoreDocument,
  parseScoreDocuments,
} from './score_repository';
import {
  buildEvaluationResults,
  calculateEvaluatorStats,
  type EvaluationReport,
} from './evaluation_stats';

export async function buildEvaluationReport({
  phoenixClient,
  experiments,
  model,
  evaluatorModel,
  repetitions,
  runId,
}: {
  phoenixClient: KibanaPhoenixClient;
  experiments: RanExperiment[];
  model: Model;
  evaluatorModel: Model;
  repetitions: number;
  runId?: string;
}): Promise<EvaluationReport> {
  const { datasetScores } = await buildEvaluationResults(experiments, phoenixClient);

  const datasetScoresWithStats = datasetScores.map((dataset) => ({
    ...dataset,
    evaluatorStats: new Map(
      Array.from(dataset.evaluatorScores.entries()).map(([evaluatorName, scores]) => {
        const stats = calculateEvaluatorStats(scores, dataset.numExamples);
        return [evaluatorName, stats];
      })
    ),
  }));

  const currentRunId = runId || process.env.TEST_RUN_ID;

  if (!currentRunId) {
    throw new Error(
      'runId must be provided either as a parameter or via TEST_RUN_ID environment variable'
    );
  }

  return {
    datasetScoresWithStats,
    model,
    evaluatorModel,
    repetitions,
    runId: currentRunId,
  };
}

export async function exportEvaluations(
  report: EvaluationReport,
  esClient: EsClient,
  log: SomeDevLog
): Promise<void> {
  if (report.datasetScoresWithStats.length === 0) {
    log.warning('No dataset scores available to export to Elasticsearch');
    return;
  }

  log.info(chalk.blue('\n═══ EXPORTING TO ELASTICSEARCH ═══'));

  const exporter = new EvaluationScoreRepository(esClient, log);

  await exporter.exportScores({
    datasetScoresWithStats: report.datasetScoresWithStats,
    model: report.model,
    evaluatorModel: report.evaluatorModel,
    runId: report.runId,
    repetitions: report.repetitions,
  });

  const modelId = report.model.id || 'unknown';

  log.info(chalk.green('✅ Model scores exported to Elasticsearch successfully!'));
  log.info(
    chalk.gray(
      `You can query the data using: environment.hostname:"${hostname()}" AND model.id:"${modelId}" AND run_id:"${
        report.runId
      }"`
    )
  );
}

export function formatReportData(scores: EvaluationScoreDocument[]): EvaluationReport {
  if (scores.length === 0) {
    throw new Error('No documents to format');
  }

  const scoresWithStats = parseScoreDocuments(scores);

  const repetitions = scores[0].repetitions ?? 1;

  return {
    datasetScoresWithStats: scoresWithStats,
    model: scores[0].model as Model,
    evaluatorModel: scores[0].evaluator_model as Model,
    repetitions,
    runId: scores[0].run_id,
  };
}
