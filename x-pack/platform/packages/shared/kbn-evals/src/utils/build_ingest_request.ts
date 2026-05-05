/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Model as InferenceModel } from '@kbn/inference-common';
import type { IngestScoresRequestBodyInput } from '@kbn/evals-common';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { BuildkiteCiMetadata } from './ci_metadata';
import type { GitMetadata } from './git_metadata';
import type { EvaluationCompleteEvent, RanExperiment } from '../types';

const MAX_INGEST_BATCH_SIZE = 1000;

type IngestScore = IngestScoresRequestBodyInput['scores'][number];

type BuildIngestRequestSource =
  | { kind: 'event'; event: EvaluationCompleteEvent }
  | { kind: 'experiments'; experiments: RanExperiment[] };

interface BuildIngestRequestArgs {
  runId: string;
  taskModel: InferenceModel;
  evaluatorModel: InferenceModel;
  repetitions: number;
  hostName: string;
  gitMetadata: GitMetadata;
  suiteId?: string;
  buildkiteMetadata?: BuildkiteCiMetadata;
  log?: Pick<SomeDevLog, 'warning'>;
  source: BuildIngestRequestSource;
}

interface BuildableScore {
  experimentId: string;
  score: IngestScore;
}

function toTaskModel(
  model: InferenceModel,
  modelId: string
): IngestScoresRequestBodyInput['task_model'] {
  return {
    id: modelId,
    ...(model.family && { family: model.family }),
    ...(model.provider && { provider: model.provider }),
  };
}

function toEvaluatorModel(
  model: InferenceModel,
  modelId: string
): IngestScoresRequestBodyInput['evaluator_model'] {
  return {
    id: modelId,
    ...(model.family && { family: model.family }),
    ...(model.provider && { provider: model.provider }),
  };
}

function toOutputObject(value: unknown): Record<string, unknown> | undefined {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function buildScorePayload(event: EvaluationCompleteEvent): IngestScore {
  const taskOutput = toOutputObject(event.taskRun.output);

  return {
    example: {
      id: event.exampleId,
      index: event.taskRun.exampleIndex,
      ...(event.taskRun.input != null &&
        !Array.isArray(event.taskRun.input) && {
          input: event.taskRun.input,
        }),
      dataset: {
        id: event.datasetId,
        name: event.datasetName,
      },
    },
    task: {
      repetition_index: event.taskRun.repetition,
      ...(event.taskRun.traceId != null && { trace_id: event.taskRun.traceId }),
      ...(taskOutput && { output: taskOutput }),
    },
    evaluator: {
      name: event.evaluationRun.name,
      ...(event.evaluationRun.result?.score !== undefined && {
        score: event.evaluationRun.result.score,
      }),
      ...(event.evaluationRun.result?.label !== undefined && {
        label: event.evaluationRun.result.label,
      }),
      ...(event.evaluationRun.result?.explanation !== undefined && {
        explanation: event.evaluationRun.result.explanation,
      }),
      ...(event.evaluationRun.result?.metadata != null &&
        !Array.isArray(event.evaluationRun.result.metadata) && {
          metadata: event.evaluationRun.result.metadata,
        }),
      ...(event.evaluationRun.traceId !== undefined && { trace_id: event.evaluationRun.traceId }),
    },
  };
}

function getEventsFromExperiment(experiment: RanExperiment): EvaluationCompleteEvent[] {
  const events: EvaluationCompleteEvent[] = [];
  const runs = experiment.runs ?? {};
  const evaluationRuns = experiment.evaluationRuns ?? [];
  const datasetName = experiment.datasetName ?? experiment.datasetId;

  for (const evaluationRun of evaluationRuns) {
    const taskRun = runs[evaluationRun.experimentRunId];
    if (!taskRun) {
      continue;
    }

    events.push({
      experimentId: experiment.id,
      datasetId: experiment.datasetId,
      datasetName,
      taskRun,
      evaluationRun,
      exampleId: evaluationRun.exampleId ?? String(taskRun.exampleIndex),
    });
  }

  return events;
}

function buildScores(source: BuildIngestRequestSource): BuildableScore[] {
  if (source.kind === 'event') {
    return [{ experimentId: source.event.experimentId, score: buildScorePayload(source.event) }];
  }

  return source.experiments.flatMap((experiment) =>
    getEventsFromExperiment(experiment).map((event) => ({
      experimentId: event.experimentId,
      score: buildScorePayload(event),
    }))
  );
}

export function buildIngestRequest({
  runId,
  taskModel,
  evaluatorModel,
  repetitions,
  hostName,
  gitMetadata,
  suiteId,
  buildkiteMetadata,
  log,
  source,
}: BuildIngestRequestArgs): IngestScoresRequestBodyInput[] {
  const scores = buildScores(source);
  const requestsByExperiment = new Map<string, IngestScore[]>();
  const taskModelId = taskModel.id;
  const evaluatorModelId = evaluatorModel.id;

  if (!taskModelId || !evaluatorModelId) {
    if (scores.length > 0) {
      log?.warning?.(
        `Skipped ${scores.length} score(s) for run "${runId}" due to missing model id`
      );
    }
    return [];
  }

  for (const { experimentId, score } of scores) {
    const existingScores = requestsByExperiment.get(experimentId) ?? [];
    existingScores.push(score);
    requestsByExperiment.set(experimentId, existingScores);
  }

  const requests: IngestScoresRequestBodyInput[] = [];
  const ingestTaskModel = toTaskModel(taskModel, taskModelId);
  const ingestEvaluatorModel = toEvaluatorModel(evaluatorModel, evaluatorModelId);

  for (const [experimentId, experimentScores] of requestsByExperiment) {
    for (let offset = 0; offset < experimentScores.length; offset += MAX_INGEST_BATCH_SIZE) {
      const chunk = experimentScores.slice(offset, offset + MAX_INGEST_BATCH_SIZE);
      if (chunk.length === 0) {
        continue;
      }

      requests.push({
        run_id: runId,
        experiment_id: experimentId,
        ...(suiteId != null && { suite_id: suiteId }),
        task_model: ingestTaskModel,
        evaluator_model: ingestEvaluatorModel,
        run_metadata: {
          total_repetitions: repetitions,
          ...(gitMetadata.branch != null && { git_branch: gitMetadata.branch }),
          ...(gitMetadata.commitSha != null && { git_commit_sha: gitMetadata.commitSha }),
        },
        environment: {
          hostname: hostName,
        },
        ...(buildkiteMetadata != null && { ci: { buildkite: buildkiteMetadata } }),
        scores: chunk,
      });
    }
  }

  return requests;
}
