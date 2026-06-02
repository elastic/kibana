/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostname } from 'os';
import type { Model } from '@kbn/inference-common';
import type { RanExperiment, EvaluationRun, TaskRun } from './types';

export interface EvaluationScoreDocument {
  '@timestamp': string;
  run_id: string;
  experiment_id: string;

  suite?: {
    id?: string;
  };
  ci?: {
    buildkite?: {
      build_id?: string;
      job_id?: string;
      build_url?: string;
      pipeline_slug?: string;
      pull_request?: string;
      branch?: string;
      commit?: string;
    };
  };

  example: {
    id: string;
    index: number;
    input?: Record<string, unknown> | null;
    dataset: {
      id: string;
      name: string;
    };
  };

  task: {
    trace_id: string | null;
    repetition_index: number;
    output?: unknown | null;
    model: Model;
  };

  evaluator: {
    name: string;
    score: number | null;
    label: string | null;
    explanation: string | null;
    metadata: Record<string, unknown> | null;
    trace_id: string | null;
    model: Model;
  };

  run_metadata: {
    git_branch: string | null;
    git_commit_sha: string | null;
    total_repetitions: number;
  };

  environment: {
    hostname: string;
  };
}

export interface ScoreDocumentRunMetadata {
  gitBranch?: string | null;
  gitCommitSha?: string | null;
}

function getTaskRun(evalRun: EvaluationRun, runs: RanExperiment['runs']): TaskRun | undefined {
  return runs[evalRun.experimentRunId];
}

export async function mapToEvaluationScoreDocuments({
  experiments,
  taskModel,
  evaluatorModel,
  runId,
  totalRepetitions,
  suiteId,
  runMetadata,
}: {
  experiments: RanExperiment[];
  taskModel: Model;
  evaluatorModel: Model;
  runId: string;
  totalRepetitions: number;
  suiteId?: string;
  runMetadata?: ScoreDocumentRunMetadata;
}): Promise<EvaluationScoreDocument[]> {
  const documents: EvaluationScoreDocument[] = [];
  const timestamp = new Date().toISOString();
  const hostName = hostname();

  for (const experiment of experiments) {
    const { datasetId, evaluationRuns, runs = {} } = experiment;
    if (!evaluationRuns) continue;

    const datasetName = experiment.datasetName ?? datasetId;

    for (const evalRun of evaluationRuns) {
      const taskRun = getTaskRun(evalRun, runs);
      if (!taskRun) continue;
      const exampleId = evalRun.exampleId ?? String(taskRun.exampleIndex);

      documents.push({
        '@timestamp': timestamp,
        run_id: runId,
        experiment_id: experiment.id ?? '',
        ...(suiteId ? { suite: { id: suiteId } } : {}),
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
          name: evalRun.name,
          score: evalRun.result?.score ?? null,
          label: evalRun.result?.label ?? null,
          explanation: evalRun.result?.explanation ?? null,
          metadata: evalRun.result?.metadata ?? null,
          trace_id: evalRun.traceId ?? null,
          model: evaluatorModel,
        },
        run_metadata: {
          git_branch: runMetadata?.gitBranch ?? null,
          git_commit_sha: runMetadata?.gitCommitSha ?? null,
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
