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
import type { EvaluationCompleteEvent, DatasetRunResult } from '../types';

const MAX_INGEST_BATCH_SIZE = 1000;

type IngestScore = IngestScoresRequestBodyInput['scores'][number];

type BuildIngestRequestSource =
  | { kind: 'event'; event: EvaluationCompleteEvent }
  | { kind: 'experiments'; experiments: DatasetRunResult[] };

interface BuildIngestRequestArgs {
  taskModel: InferenceModel;
  evaluatorModel: InferenceModel;
  repetitions: number;
  hostName: string;
  gitMetadata: GitMetadata;
  suiteId?: string;
  executionId?: string;
  buildkiteMetadata?: BuildkiteCiMetadata;
  log?: Pick<SomeDevLog, 'warning'>;
  source: BuildIngestRequestSource;
}

interface BuildableScore {
  experimentId: string;
  experimentName?: string;
  score: IngestScore;
}

function toModel(model: InferenceModel): IngestScoresRequestBodyInput['task_model'] | undefined {
  if (!model.id) {
    return undefined;
  }
  return {
    id: model.id,
    ...(model.family && { family: model.family }),
    ...(model.provider && { provider: model.provider }),
  };
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

function buildScorePayload(event: EvaluationCompleteEvent): IngestScore {
  const { taskRun, evaluationRun } = event;
  const taskOutput = isPlainObject(taskRun.output) ? taskRun.output : undefined;
  const result = evaluationRun.result;

  return {
    example: {
      id: event.exampleId,
      index: taskRun.exampleIndex,
      ...(isPlainObject(taskRun.input) && { input: taskRun.input }),
      dataset: {
        id: event.datasetId,
        name: event.datasetName,
      },
    },
    task: {
      repetition_index: taskRun.repetition,
      ...(taskRun.traceId != null && { trace_id: taskRun.traceId }),
      ...(taskOutput && { output: taskOutput }),
    },
    evaluator: {
      name: evaluationRun.name,
      ...(result?.score !== undefined && { score: result.score }),
      ...(result?.label !== undefined && { label: result.label }),
      ...(result?.explanation !== undefined && { explanation: result.explanation }),
      ...(isPlainObject(result?.metadata) && { metadata: result.metadata }),
      ...(evaluationRun.traceId !== undefined && { trace_id: evaluationRun.traceId }),
    },
  };
}

function getEventsFromExperiment(experiment: DatasetRunResult): EvaluationCompleteEvent[] {
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
      experimentName: experiment.experimentName,
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
    return [
      {
        experimentId: source.event.experimentId,
        experimentName: source.event.experimentName,
        score: buildScorePayload(source.event),
      },
    ];
  }

  return source.experiments.flatMap((experiment) =>
    getEventsFromExperiment(experiment).map((event) => ({
      experimentId: event.experimentId,
      experimentName: event.experimentName,
      score: buildScorePayload(event),
    }))
  );
}

export function buildIngestRequest({
  taskModel,
  evaluatorModel,
  repetitions,
  hostName,
  gitMetadata,
  suiteId,
  executionId,
  buildkiteMetadata,
  log,
  source,
}: BuildIngestRequestArgs): IngestScoresRequestBodyInput[] {
  const taskModelPayload = toModel(taskModel);
  const evaluatorModelPayload = toModel(evaluatorModel);
  const scores = buildScores(source);

  if (!taskModelPayload || !evaluatorModelPayload) {
    if (scores.length > 0) {
      log?.warning?.(`Skipped ${scores.length} score(s) due to missing model id`);
    }
    return [];
  }

  const requestsByExperiment = new Map<
    string,
    { experimentName?: string; scores: IngestScore[] }
  >();

  for (const { experimentId, experimentName, score } of scores) {
    const existing = requestsByExperiment.get(experimentId) ?? { experimentName, scores: [] };
    existing.scores.push(score);
    requestsByExperiment.set(experimentId, existing);
  }

  const requests: IngestScoresRequestBodyInput[] = [];

  for (const [experimentId, { experimentName, scores: experimentScores }] of requestsByExperiment) {
    const gitInfo = {
      ...(gitMetadata.branch != null && { branch: gitMetadata.branch }),
      ...(gitMetadata.commitSha != null && { commit_sha: gitMetadata.commitSha }),
    };

    for (let offset = 0; offset < experimentScores.length; offset += MAX_INGEST_BATCH_SIZE) {
      const chunk = experimentScores.slice(offset, offset + MAX_INGEST_BATCH_SIZE);
      requests.push({
        experiment_id: experimentId,
        ...(experimentName != null && { experiment_name: experimentName }),
        task_model: taskModelPayload,
        evaluator_model: evaluatorModelPayload,
        metadata: {
          execution_id: executionId ?? experimentId,
          ...(suiteId != null && { suite_id: suiteId }),
          total_repetitions: repetitions,
          hostname: hostName,
          ...(Object.keys(gitInfo).length > 0 && { git: gitInfo }),
          ...(buildkiteMetadata != null && { ci: buildkiteMetadata }),
        },
        scores: chunk,
      });
    }
  }

  return requests;
}
