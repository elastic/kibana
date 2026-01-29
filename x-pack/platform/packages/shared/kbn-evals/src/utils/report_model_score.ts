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
import {
  EvaluationScoreRepository,
  type EvaluationScoreDocument,
  type ModelInfo,
} from './score_repository';
import { getGitMetadata } from './git_metadata';
import { getCurrentTraceId } from './tracing';
import type { RanExperiment } from '../types';

function computeInputHash(input: unknown): string {
  try {
    const json = JSON.stringify(input);
    return createHash('sha256').update(json).digest('hex').substring(0, 16);
  } catch {
    return '';
  }
}

export async function buildFlattenedScoreDocuments({
  experiments,
  taskModel,
  evaluatorModel,
  runId,
  totalRepetitions,
}: {
  experiments: RanExperiment[];
  taskModel: ModelInfo;
  evaluatorModel: ModelInfo | null;
  runId: string;
  totalRepetitions: number;
}): Promise<EvaluationScoreDocument[]> {
  const documents: EvaluationScoreDocument[] = [];
  const timestamp = new Date().toISOString();
  const gitMetadata = getGitMetadata();
  const hostName = hostname();

  for (const experiment of experiments) {
    const { datasetId, evaluationRuns, runs } = experiment;
    const datasetName = experiment.datasetName ?? datasetId;
    const runsById = runs ?? {};
    const runsList = Object.values(runsById);

    if (!evaluationRuns) {
      continue;
    }

    for (const evalRun of evaluationRuns) {
      const evalRunInfo = evalRun as {
        exampleId?: string;
        exampleIndex?: number;
        repetitionIndex?: number;
        experimentRunId?: string;
        traceId?: string | null;
        name: string;
        result?: {
          score?: number | null;
          label?: string | null;
          explanation?: string | null;
          metadata?: Record<string, unknown> | null;
        };
      };
      let runEntry: (typeof runsById)[string] | undefined;
      if (evalRunInfo.experimentRunId && runsById[evalRunInfo.experimentRunId]) {
        runEntry = runsById[evalRunInfo.experimentRunId];
      } else if (evalRunInfo.exampleIndex !== undefined && evalRunInfo.repetitionIndex !== undefined) {
        runEntry = runsList.find(
          (run) =>
            run.exampleIndex === evalRunInfo.exampleIndex &&
            run.repetition === evalRunInfo.repetitionIndex
        );
      }

      const exampleIndex = runEntry?.exampleIndex ?? evalRunInfo.exampleIndex ?? 0;
      const repetitionIndex = evalRunInfo.repetitionIndex ?? runEntry?.repetition ?? 0;
      const exampleId =
        evalRunInfo.exampleId ??
        (runEntry as any)?.datasetExampleId ??
        (exampleIndex !== undefined ? String(exampleIndex) : '');
      const inputHash = runEntry?.input ? computeInputHash(runEntry.input) : '';

      documents.push({
        '@timestamp': timestamp,
        run_id: runId,
        experiment_id: experiment.id ?? '',
        example: {
          id: exampleId,
          index: exampleIndex,
          input_hash: inputHash,
          dataset: {
            id: datasetId,
            name: datasetName,
          },
        },
        task: {
          trace_id: runEntry?.traceId ?? getCurrentTraceId(),
          repetition_index: repetitionIndex,
          model: taskModel,
        },
        evaluator: {
          name: evalRunInfo.name,
          score: evalRunInfo.result?.score ?? null,
          label: evalRunInfo.result?.label ?? null,
          explanation: evalRunInfo.result?.explanation ?? null,
          metadata: evalRunInfo.result?.metadata ?? null,
          trace_id: evalRunInfo.traceId ?? getCurrentTraceId(),
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

  const modelId = documents[0]?.task.model.id || 'unknown';
  const hostName = documents[0]?.environment.hostname || hostname();
  const runId = documents[0]?.run_id;

  log.info(chalk.green('✅ Evaluation scores exported successfully!'));
  if (runId) {
    log.info(
      chalk.gray(
        `You can query the data using: environment.hostname:"${hostName}" AND task.model.id:"${modelId}" AND run_id:"${runId}"`
      )
    );
  }
}

