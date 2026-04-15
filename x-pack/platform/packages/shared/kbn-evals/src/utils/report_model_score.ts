/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import chalk from 'chalk';
import { hostname } from 'os';
import type { Model } from '@kbn/inference-common';
import type { EvaluationScoreRepository } from './score_repository';
import { type EvaluationScoreDocument } from './score_repository';
import { getGitMetadata, type GitMetadata } from './git_metadata';
import type { RanExperiment, EvaluationRun, EvaluationCompleteEvent, TaskRun } from '../types';

function getTaskRun(evalRun: EvaluationRun, runs: RanExperiment['runs']): TaskRun {
  return runs[evalRun.experimentRunId];
}

export interface BuildSingleScoreDocumentParams {
  event: EvaluationCompleteEvent;
  taskModel: Model;
  evaluatorModel: Model;
  runId: string;
  totalRepetitions: number;
  timestamp: string;
  gitMetadata: GitMetadata;
  hostName: string;
}

/**
 * Builds a single `EvaluationScoreDocument` from an incremental evaluation event.
 * Used by the Playwright fixture callback to export each evaluator result as it completes.
 * The same document structure is produced by `mapToEvaluationScoreDocuments` for the batch path.
 */
export function buildSingleScoreDocument({
  event,
  taskModel,
  evaluatorModel,
  runId,
  totalRepetitions,
  timestamp,
  gitMetadata: git,
  hostName,
}: BuildSingleScoreDocumentParams): EvaluationScoreDocument {
  const { experimentId, datasetId, datasetName, taskRun, evaluationRun, exampleId } = event;

  return {
    '@timestamp': timestamp,
    run_id: runId,
    experiment_id: experimentId,
    example: {
      id: exampleId,
      index: taskRun.exampleIndex,
      input: taskRun.input ?? null,
      dataset: {
        id: datasetId,
        name: datasetName,
      },
    },
    task: {
      trace_id: taskRun.traceId ?? null,
      repetition_index: taskRun.repetition,
      output: taskRun.output ?? null,
      model: taskModel,
    },
    evaluator: {
      name: evaluationRun.name,
      score: evaluationRun.result?.score ?? null,
      label: evaluationRun.result?.label ?? null,
      explanation: evaluationRun.result?.explanation ?? null,
      metadata: evaluationRun.result?.metadata ?? null,
      trace_id: evaluationRun.traceId ?? null,
      model: evaluatorModel,
    },
    run_metadata: {
      git_branch: git.branch,
      git_commit_sha: git.commitSha,
      total_repetitions: totalRepetitions,
    },
    environment: {
      hostname: hostName,
    },
  };
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
  const git = getGitMetadata();
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

      documents.push(
        buildSingleScoreDocument({
          event: {
            experimentId: experiment.id ?? '',
            datasetId,
            datasetName,
            taskRun,
            evaluationRun: evalRun,
            exampleId,
          },
          taskModel,
          evaluatorModel,
          runId,
          totalRepetitions,
          timestamp,
          gitMetadata: git,
          hostName,
        })
      );
    }
  }

  return documents;
}

export async function exportEvaluations(
  documents: EvaluationScoreDocument[],
  scoreRepository: EvaluationScoreRepository,
  log: SomeDevLog
): Promise<void> {
  if (documents.length === 0) {
    log.warning('No evaluation scores to export');
    return;
  }

  log.info(chalk.blue('\n═══ EXPORTING TO ELASTICSEARCH ═══'));

  await scoreRepository.exportScores(documents);

  const { run_id: docRunId, task, environment } = documents[0];

  log.info(chalk.green('✅ Evaluation scores exported successfully!'));
  log.info(
    chalk.gray(
      `You can query the data using: environment.hostname:"${environment.hostname}" AND task.model.id:"${task.model.id}" AND run_id:"${docRunId}"`
    )
  );
}
