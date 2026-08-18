/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  API_VERSIONS,
  DATASET_UUID_NAMESPACE,
  EVALS_DATASETS_URL,
  EVALS_DATASET_UPSERT_URL,
  EVALS_DATASET_URL,
  EVALS_EXPERIMENT_SCORES_URL,
  EVALS_EXPERIMENT_URL,
  EVALS_EXPERIMENTS_URL,
  EVALS_SCORES_URL,
  GetEvaluationDatasetResponse,
  GetEvaluationExperimentResponse,
  GetEvaluationExperimentScoresResponse,
  GetEvaluationExperimentsResponse,
  IngestScoresRequestBody,
  IngestScoresResponse,
  MAX_SCORES_PER_QUERY,
  type DatasetMaturity,
  type EvaluationExperimentSummary,
  type EvaluationScoreDocument,
  type IngestScoresRequestBodyInput,
  type Model as EvalsModel,
} from '@kbn/evals-common';
import { v5 as uuidv5 } from 'uuid';
import { getStatusCode } from './retry_utils';

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

export interface ExperimentStats {
  stats: EvaluatorStats[];
  taskModel: EvalsModel;
  evaluatorModel: EvalsModel;
  totalRepetitions: number;
}

interface GetExperimentFilters {
  taskModelId?: string;
  suiteId?: string;
  executionId?: string;
}

export interface ListExperimentsFilters {
  suiteId?: string;
  taskModelId?: string;
  branch?: string;
  datasetId?: string;
  buildId?: string;
  /** Maximum number of experiments to return (newest first). Defaults to and capped at 100 (the route's per_page maximum). */
  limit?: number;
}

/**
 * Upper bound accepted by the experiments route (per_page <= 100). The route is
 * not a paged search: it re-runs a terms aggregation whose size grows with
 * `page * per_page`, so paging through it re-scans an ever-growing bucket set
 * and hits ES bucket limits long before any useful depth. Callers must filter
 * (suite, model, build, ...) so a single bounded page covers what they need.
 */
export const MAX_LIST_EXPERIMENTS = 100;

export interface UpsertDatasetInput {
  name: string;
  description: string;
  tags?: string[];
  maturity?: DatasetMaturity;
  examples: Array<{
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>;
}

export interface DatasetWithId {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  maturity?: DatasetMaturity;
  examples: Array<{
    id: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>;
}

interface IngestScoresResult {
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
  body: IngestScoresResult;
}

export interface BaselineExperiment {
  executionId: string;
  timestamp: string | undefined;
  gitCommitSha: string | null;
  gitBranch: string | null;
}

const EVALS_PLUGIN_DISABLED_MESSAGE =
  'Evaluations plugin is not enabled on the target Kibana. Ensure xpack.evals.enabled=true is set in the Kibana configuration.';

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

const toIngestScoresError = (statusCode: 400 | 429 | 500, body: IngestScoresResult) =>
  Object.assign(new Error(`Failed to ingest scores (status ${statusCode})`), {
    statusCode,
    body,
  }) as IngestScoresError;

const mapStatsResponse = (
  response: ReturnType<typeof GetEvaluationExperimentResponse.parse>
): ExperimentStats => {
  const { task_model: taskModel, evaluator_model: evaluatorModel } = response;
  if (!taskModel || !evaluatorModel) {
    throw new Error('Evaluation experiment is missing model metadata');
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

const buildExperimentQuery = (options?: GetExperimentFilters) => ({
  suite_id: options?.suiteId,
  model_id: options?.taskModelId,
  execution_id: options?.executionId,
});

const VERSIONED_HEADERS = { 'elastic-api-version': API_VERSIONS.internal.v1 };

export class EvalsClient {
  constructor(private readonly kbnClient: KbnClient, private readonly log: SomeDevLog) {}

  async ingestScores(request: IngestScoresRequestBodyInput): Promise<IngestScoresResult> {
    const body = IngestScoresRequestBody.parse(request);
    const response = await this.kbnClient.request({
      path: EVALS_SCORES_URL,
      method: 'POST',
      body,
      headers: VERSIONED_HEADERS,
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

  async getExperimentStats(
    experimentId: string,
    options?: GetExperimentFilters
  ): Promise<ExperimentStats | null> {
    try {
      const response = await this.kbnClient.request({
        path: EVALS_EXPERIMENT_URL.replace('{experimentId}', encodeURIComponent(experimentId)),
        method: 'GET',
        query: buildExperimentQuery(options),
        headers: VERSIONED_HEADERS,
      });

      return mapStatsResponse(GetEvaluationExperimentResponse.parse(getResponseData(response)));
    } catch (error: unknown) {
      this.log.error(
        `Failed to retrieve stats for experiment ID ${experimentId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  async getExperimentScores(
    experimentId: string,
    options?: GetExperimentFilters
  ): Promise<EvaluationScoreDocument[]> {
    try {
      const response = await this.kbnClient.request({
        path: EVALS_EXPERIMENT_SCORES_URL.replace(
          '{experimentId}',
          encodeURIComponent(experimentId)
        ),
        method: 'GET',
        query: buildExperimentQuery(options),
        headers: VERSIONED_HEADERS,
      });
      const parsed = GetEvaluationExperimentScoresResponse.parse(getResponseData(response));

      if (parsed.total > MAX_SCORES_PER_QUERY) {
        throw new Error(
          `Experiment ${experimentId} returned ${parsed.total} scores, which exceeds MAX_SCORES_PER_QUERY (${MAX_SCORES_PER_QUERY})`
        );
      }

      return parsed.scores;
    } catch (error: unknown) {
      this.log.error(
        `Failed to retrieve scores for experiment ID ${experimentId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  async upsertDataset(dataset: UpsertDatasetInput): Promise<void> {
    await this.kbnClient.request({
      path: EVALS_DATASET_UPSERT_URL,
      method: 'POST',
      body: {
        name: dataset.name,
        description: dataset.description,
        // Omitted rather than sent as `undefined` so a suite that doesn't
        // declare tags leaves the stored ones alone.
        ...(dataset.tags ? { tags: dataset.tags } : {}),
        ...(dataset.maturity ? { maturity: dataset.maturity } : {}),
        examples: dataset.examples,
      },
      headers: VERSIONED_HEADERS,
      retries: 0,
    });
  }

  async getDatasetByName(datasetName: string): Promise<DatasetWithId | null> {
    try {
      const datasetId = uuidv5(datasetName, DATASET_UUID_NAMESPACE);
      const response = await this.kbnClient.request({
        path: EVALS_DATASET_URL.replace('{datasetId}', encodeURIComponent(datasetId)),
        method: 'GET',
        headers: VERSIONED_HEADERS,
        retries: 0,
      });

      const parsed = GetEvaluationDatasetResponse.parse(getResponseData(response));

      return {
        id: parsed.id,
        name: parsed.name,
        description: parsed.description,
        tags: parsed.tags,
        maturity: parsed.maturity,
        examples: parsed.examples.map(({ id, input, output, metadata }) => ({
          id,
          input,
          output,
          metadata,
        })),
      };
    } catch (error: unknown) {
      if (getStatusCode(error) === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Lists the newest experiments matching the given filters via a single
   * bounded request.
   *
   * The experiments route is not a paged search: it re-runs a terms
   * aggregation whose bucket size grows with `page * per_page`, so paging
   * through it re-scans an ever-growing bucket set and hits ES bucket limits
   * long before any useful page depth. Callers that need the full history must
   * narrow the query with filters (suite, model, build, ...) instead.
   *
   * The route's `branch` filter is a case-insensitive substring match, so this
   * method additionally applies an exact (case-sensitive) client-side match on
   * the resolved `git_branch` when a branch filter is provided.
   */
  async listExperiments(filters?: ListExperimentsFilters): Promise<EvaluationExperimentSummary[]> {
    const limit = Math.min(filters?.limit ?? MAX_LIST_EXPERIMENTS, MAX_LIST_EXPERIMENTS);
    const response = await this.kbnClient.request({
      path: EVALS_EXPERIMENTS_URL,
      method: 'GET',
      query: {
        suite_id: filters?.suiteId,
        model_id: filters?.taskModelId,
        branch: filters?.branch,
        dataset_id: filters?.datasetId,
        build_id: filters?.buildId,
        page: 1,
        per_page: limit,
      },
      headers: VERSIONED_HEADERS,
    });

    const parsed = GetEvaluationExperimentsResponse.parse(getResponseData(response));
    if (!filters?.branch) {
      return parsed.experiments;
    }
    return parsed.experiments.filter((experiment) => experiment.git_branch === filters.branch);
  }

  async findLatestExperimentForBuild({
    suiteId,
    branch,
    baseExecutionId,
  }: {
    suiteId: string;
    branch?: string;
    baseExecutionId: string;
  }): Promise<BaselineExperiment | undefined> {
    try {
      // metadata.ci.build_id stores the raw BUILDKITE_BUILD_ID without the "bk-" prefix.
      const rawBuildId = baseExecutionId.startsWith('bk-')
        ? baseExecutionId.slice(3)
        : baseExecutionId;

      const response = await this.kbnClient.request({
        path: EVALS_EXPERIMENTS_URL,
        method: 'GET',
        query: {
          suite_id: suiteId,
          build_id: rawBuildId,
          ...(branch != null && { branch }),
          page: 1,
          per_page: 20,
        },
        headers: VERSIONED_HEADERS,
      });

      const parsed = GetEvaluationExperimentsResponse.parse(getResponseData(response));
      const match = parsed.experiments.find(
        (exp) =>
          // The route's branch filter is a case-insensitive substring match;
          // require an exact client-side match so sibling branches like
          // `feature/main-cleanup` are never picked as this build's experiment.
          exp.execution_id != null &&
          exp.execution_id.startsWith(`${baseExecutionId}::`) &&
          (branch == null || exp.git_branch === branch)
      );

      if (!match || !match.execution_id) {
        return undefined;
      }

      return {
        executionId: match.execution_id,
        timestamp: match.timestamp,
        gitCommitSha: match.git_commit_sha ?? null,
        gitBranch: match.git_branch ?? null,
      };
    } catch (error: unknown) {
      this.log.error(
        `Failed to find experiment for build ${baseExecutionId} on branch ${branch}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    }
  }

  async findLatestBaselineExperiment({
    suiteId,
    branch,
    taskModelId,
    excludeExecutionId,
  }: {
    suiteId: string;
    branch: string;
    taskModelId?: string;
    excludeExecutionId?: string;
  }): Promise<BaselineExperiment | undefined> {
    try {
      const response = await this.kbnClient.request({
        path: EVALS_EXPERIMENTS_URL,
        method: 'GET',
        query: {
          suite_id: suiteId,
          branch,
          ...(taskModelId && { model_id: taskModelId }),
          page: 1,
          per_page: 5,
        },
        headers: VERSIONED_HEADERS,
      });

      const parsed = GetEvaluationExperimentsResponse.parse(getResponseData(response));
      const match = parsed.experiments.find(
        (exp) =>
          // The route's branch filter is a case-insensitive substring match;
          // require an exact client-side match so a baseline from a sibling
          // branch (e.g. `feature/main-cleanup`) is never selected.
          exp.execution_id != null &&
          exp.execution_id !== excludeExecutionId &&
          exp.git_branch === branch
      );

      if (!match || !match.execution_id) {
        return undefined;
      }

      return {
        executionId: match.execution_id,
        timestamp: match.timestamp,
        gitCommitSha: match.git_commit_sha ?? null,
        gitBranch: match.git_branch ?? null,
      };
    } catch (error: unknown) {
      this.log.error(
        `Failed to find baseline experiment for suite ${suiteId} on branch ${branch}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    }
  }

  async assertPluginEnabled(): Promise<void> {
    try {
      await this.kbnClient.request({
        path: EVALS_DATASETS_URL,
        method: 'GET',
        query: { page: 1, per_page: 1 },
        headers: VERSIONED_HEADERS,
        retries: 0,
      });
    } catch (error: unknown) {
      if (getStatusCode(error) === 404) {
        throw new Error(EVALS_PLUGIN_DISABLED_MESSAGE);
      }
      throw error;
    }
  }
}
