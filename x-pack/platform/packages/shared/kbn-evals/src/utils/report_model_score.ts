/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { SomeDevLog } from '@kbn/some-dev-log';
import chalk from 'chalk';
import { createHash } from 'crypto';
import { hostname } from 'os';
import type { Model } from '@kbn/inference-common';
import { EvaluationScoreRepository, type EvaluationScoreDocument } from './score_repository';
import { getGitMetadata } from './git_metadata';
import type { RanExperiment, EvaluationRun, TaskRun } from '../types';

function computeInputHash(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex').substring(0, 16);
}

function getTaskRun(evalRun: EvaluationRun, runs: RanExperiment['runs']): TaskRun {
  return runs[evalRun.experimentRunId];
}

export async function mapToEvaluationScoreDocuments({
  experiments,
  taskModel,
  evaluatorModel,
  runId,
  totalRepetitions,
}: {
  experiments: RanExperiment[];
  taskModel: Model;
  evaluatorModel: Model;
  runId: string;
  totalRepetitions: number;
}): Promise<EvaluationScoreDocument[]> {
  const documents: EvaluationScoreDocument[] = [];
  const timestamp = new Date().toISOString();
  const gitMetadata = getGitMetadata();
  const hostName = hostname();

  for (const experiment of experiments) {
    const { datasetId, evaluationRuns, runs = {} } = experiment;
    if (!evaluationRuns) {
      continue;
    }

    const datasetName = experiment.datasetName ?? datasetId;

    for (const evalRun of evaluationRuns) {
      const taskRun = getTaskRun(evalRun, runs);
      const exampleId = evalRun.exampleId ?? String(taskRun.exampleIndex);

      documents.push({
        '@timestamp': timestamp,
        run_id: runId,
        experiment_id: experiment.id ?? '',
        example: {
          id: exampleId,
          index: taskRun.exampleIndex,
          input_hash: computeInputHash(taskRun.input),
          dataset: {
            id: datasetId,
            name: datasetName,
          },
        },
        task: {
          trace_id: taskRun.traceId ?? null,
          repetition_index: taskRun.repetition,
          model: taskModel,
        },
        evaluator: {
          name: evalRun.name,
          score: evalRun.result?.score ?? null,
          label: evalRun.result?.label ?? null,
          explanation: evalRun.result?.explanation ?? null,
          metadata: evalRun.result?.metadata ?? null,
          trace_id: evalRun.traceId ?? null,
          model: evaluatorModel,
        },
        run_metadata: {
          git_branch: gitMetadata.branch,
          git_commit_sha: gitMetadata.commitSha,
          total_repetitions: totalRepetitions,
        },
        environment: {
          hostname: hostName,
        },
      });
    }
  }

  return documents;
}

export async function exportEvaluations(
  documents: EvaluationScoreDocument[],
  esClient: EsClient,
  log: SomeDevLog
): Promise<void> {
  if (documents.length === 0) {
    log.warning('No evaluation scores to export');
    return;
  }

  log.info(chalk.blue('\n═══ EXPORTING TO ELASTICSEARCH ═══'));

  const exporter = new EvaluationScoreRepository(esClient, log);
  await exporter.exportScores(documents);

  const { run_id: docRunId, task, environment } = documents[0];

  log.info(chalk.green('✅ Evaluation scores exported successfully!'));
  log.info(
    chalk.gray(
      `You can query the data using: environment.hostname:"${environment.hostname}" AND task.model.id:"${task.model.id}" AND run_id:"${docRunId}"`
    )
  );
}
