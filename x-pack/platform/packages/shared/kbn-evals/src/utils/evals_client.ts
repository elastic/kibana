/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  EVALS_RUN_SCORES_URL,
  EVALS_RUN_URL,
  EVALS_SCORES_URL,
  GetEvaluationRunResponse,
  GetEvaluationRunScoresResponse,
  IngestScoresRequestBody,
  IngestScoresResponse,
  MAX_SCORES_PER_QUERY,
  type EvaluationScoreDocument,
  type IngestScoresRequestBodyInput,
  type Model as EvalsModel,
} from '@kbn/evals-common';
import { checkEvaluationsPluginEnabled } from './evaluations_kbn_client';

export interface EvaluatorStats {
  datasetId: string;
  datasetName: string;
  evaluatorName: string;
  stats: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    count: number;
  };
}

export interface RunStats {
  stats: EvaluatorStats[];
  taskModel: EvalsModel;
  evaluatorModel: EvalsModel;
  totalRepetitions: number;
}

interface GetRunFilters {
  taskModelId?: string;
  suiteId?: string;
}

interface IngestScoresFailureResponse {
  ingested: number;
  conflicted: number;
  failed: Array<{
    index: number;
    status: number;
    reason: string;
  }>;
}

export interface IngestScoresError extends Error {
  statusCode: 400 | 429 | 500;
  body: IngestScoresFailureResponse;
}

const EVALS_PLUGIN_DISABLED_MESSAGE =
  'Evaluations plugin is not enabled on the target Kibana. Set EVALUATIONS_KBN_URL and ensure xpack.evals.enabled=true on the target Kibana.';

const getResponseData = (response: unknown): unknown => {
  if (typeof response === 'object' && response !== null && 'data' in response) {
    return (response as { data: unknown }).data;
  }

  return response;
};

const getResponseStatusCode = (response: unknown): number | undefined => {
  if (typeof response !== 'object' || response === null || !('status' in response)) {
    return undefined;
  }

  const status = (response as { status: unknown }).status;
  return typeof status === 'number' ? status : undefined;
};

const toIngestScoresError = (statusCode: 400 | 429 | 500, body: IngestScoresFailureResponse) =>
  Object.assign(new Error(`Failed to ingest scores (status ${statusCode})`), {
    statusCode,
    body,
  }) as IngestScoresError;

const mapStatsResponse = (
  response: ReturnType<typeof GetEvaluationRunResponse.parse>
): RunStats => {
  const { task_model: taskModel, evaluator_model: evaluatorModel } = response;
  if (!taskModel || !evaluatorModel) {
    throw new Error('Evaluation run is missing model metadata');
  }

  return {
    taskModel,
    evaluatorModel,
    totalRepetitions: response.total_repetitions ?? 1,
    stats: response.stats.map((stat) => ({
      datasetId: stat.dataset_id,
      datasetName: stat.dataset_name,
      evaluatorName: stat.evaluator_name,
      stats: {
        mean: stat.stats.mean,
        median: stat.stats.median,
        stdDev: stat.stats.std_dev,
        min: stat.stats.min,
        max: stat.stats.max,
        count: stat.stats.count,
      },
    })),
  };
};

const buildRunQuery = (options?: GetRunFilters) => ({
  suite_id: options?.suiteId,
  model_id: options?.taskModelId,
});

export class EvalsClient {
  constructor(private readonly kbnClient: KbnClient, private readonly log: SomeDevLog) {}

  async ingestScores(request: IngestScoresRequestBodyInput): Promise<IngestScoresFailureResponse> {
    const body = IngestScoresRequestBody.parse(request);
    const response = await this.kbnClient.request({
      path: EVALS_SCORES_URL,
      method: 'POST',
      body,
      ignoreErrors: [400, 429, 500],
    });
    const statusCode = getResponseStatusCode(response);
    const data = getResponseData(response);

    if (statusCode === 400 || statusCode === 429 || statusCode === 500) {
      const parseResult = IngestScoresResponse.safeParse(data);
      if (parseResult.success) {
        throw toIngestScoresError(statusCode, parseResult.data);
      }
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message: unknown }).message)
          : `Server returned ${statusCode}`;
      throw toIngestScoresError(statusCode, {
        ingested: 0,
        conflicted: 0,
        failed: [{ index: -1, status: statusCode, reason: message }],
      });
    }

    return IngestScoresResponse.parse(data);
  }

  async getRunStats(runId: string, options?: GetRunFilters): Promise<RunStats | null> {
    try {
      const response = await this.kbnClient.request({
        path: EVALS_RUN_URL.replace('{runId}', encodeURIComponent(runId)),
        method: 'GET',
        query: buildRunQuery(options),
      });

      return mapStatsResponse(GetEvaluationRunResponse.parse(getResponseData(response)));
    } catch (error: unknown) {
      this.log.error(`Failed to retrieve stats for run ID ${runId}:`, error);
      return null;
    }
  }

  async getRunScores(runId: string, options?: GetRunFilters): Promise<EvaluationScoreDocument[]> {
    try {
      const response = await this.kbnClient.request({
        path: EVALS_RUN_SCORES_URL.replace('{runId}', encodeURIComponent(runId)),
        method: 'GET',
        query: buildRunQuery(options),
      });
      const parsed = GetEvaluationRunScoresResponse.parse(getResponseData(response));

      if (parsed.total > MAX_SCORES_PER_QUERY) {
        throw new Error(
          `Run ${runId} returned ${parsed.total} scores, which exceeds MAX_SCORES_PER_QUERY (${MAX_SCORES_PER_QUERY})`
        );
      }

      return parsed.scores;
    } catch (error: unknown) {
      this.log.error(`Failed to retrieve scores for run ID ${runId}:`, error);
      return [];
    }
  }

  getScoresByRunId(runId: string, options?: GetRunFilters): Promise<EvaluationScoreDocument[]> {
    return this.getRunScores(runId, options);
  }

  async assertPluginEnabled(): Promise<void> {
    const isEnabled = await checkEvaluationsPluginEnabled({
      kbnClient: this.kbnClient,
      log: this.log,
    });
    if (!isEnabled) {
      throw new Error(EVALS_PLUGIN_DISABLED_MESSAGE);
    }
  }
}
