/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface RunFilterOptions {
  suiteId?: string;
  modelId?: string;
}

interface RunsListingFilterOptions {
  suiteId?: string;
  modelId?: string;
  branch?: string;
}

interface RunsListingPaginationOptions {
  page: number;
  perPage: number;
}

interface TermsBucket {
  buckets?: Array<{ key: string }>;
}

interface RunBucket {
  key: string;
  doc_count: number;
  latest_timestamp?: { value_as_string?: string };
  suite_id?: TermsBucket;
  task_model_id?: TermsBucket;
  task_model_family?: TermsBucket;
  task_model_provider?: TermsBucket;
  evaluator_model_id?: TermsBucket;
  evaluator_model_family?: TermsBucket;
  evaluator_model_provider?: TermsBucket;
  git_branch?: TermsBucket;
  git_commit_sha?: TermsBucket;
  total_repetitions?: { value?: number };
  build_url?: TermsBucket;
}

interface RunsListingAggregations {
  total_runs?: { value: number };
  runs?: { buckets?: RunBucket[] };
}

export interface RunsListingResult {
  runs: Array<{
    run_id: string;
    timestamp: string | undefined;
    suite_id: string | undefined;
    task_model: { id: string; family: string | undefined; provider: string | undefined };
    evaluator_model: { id: string; family: string | undefined; provider: string | undefined };
    git_branch: string | null;
    git_commit_sha: string | null;
    total_repetitions: number;
    ci: { build_url: string | undefined };
  }>;
  total: number;
}

// ---------------------------------------------------------------------------
// Single-run filter query
// ---------------------------------------------------------------------------

/**
 * Builds a bool/must query that filters evaluation score documents by run ID
 * with optional suite and task model filters.
 */
export const buildRunFilterQuery = (
  runId: string,
  options?: RunFilterOptions
): { bool: { must: Array<Record<string, unknown>> } } => {
  const must: Array<Record<string, unknown>> = [{ term: { run_id: runId } }];
  if (options?.suiteId) {
    must.push({ term: { 'suite.id': options.suiteId } });
  }
  if (options?.modelId) {
    must.push({ term: { 'task.model.id': options.modelId } });
  }
  return { bool: { must } };
};

// ---------------------------------------------------------------------------
// Per-run stats aggregation
// ---------------------------------------------------------------------------

/**
 * Returns the aggregation tree for computing per-evaluator, per-dataset statistics
 * (mean, median, std_dev, min, max, count).
 */
export const buildStatsAggregation = () => ({
  by_dataset: {
    terms: { field: 'example.dataset.id', size: 10000 },
    aggs: {
      dataset_name: { terms: { field: 'example.dataset.name', size: 1 } },
      by_evaluator: {
        terms: { field: 'evaluator.name', size: 1000 },
        aggs: {
          score_stats: { extended_stats: { field: 'evaluator.score' } },
          score_median: { percentiles: { field: 'evaluator.score', percents: [50] } },
        },
      },
    },
  },
});

/**
 * Standard sort order for retrieving individual score documents,
 * grouped by dataset, example, evaluator, then repetition.
 */
type SortField = Record<string, { order: 'asc' | 'desc' }>;

export const SCORES_SORT_ORDER: SortField[] = [
  { 'example.dataset.name': { order: 'asc' } },
  { 'example.index': { order: 'asc' } },
  { 'evaluator.name': { order: 'asc' } },
  { 'task.repetition_index': { order: 'asc' } },
];

// ---------------------------------------------------------------------------
// Runs listing query, aggregation, and response parser
// ---------------------------------------------------------------------------

/**
 * Builds the filter query for the runs listing endpoint.
 * Supports optional suite, model, and branch filters.
 */
export const buildRunsListingFilterQuery = (
  options?: RunsListingFilterOptions
): Record<string, unknown> => {
  const filters: Array<Record<string, unknown>> = [];

  if (options?.suiteId) {
    filters.push({ term: { 'suite.id': options.suiteId } });
  }
  if (options?.modelId) {
    filters.push({ term: { 'task.model.id': options.modelId } });
  }
  if (options?.branch) {
    filters.push({ term: { 'run_metadata.git_branch': options.branch } });
  }

  return filters.length > 0 ? { bool: { filter: filters } } : { match_all: {} };
};

/**
 * Returns the aggregation definition for listing runs with summary metadata.
 * Groups score documents by run_id and extracts the latest timestamp,
 * model info, git metadata, and CI info for each run.
 *
 * Terms aggregations don't support a native offset, so we over-fetch
 * (page * perPage buckets) and let `parseRunsListingResponse` slice the
 * correct window.
 */
export const buildRunsListingAggregation = ({ page, perPage }: RunsListingPaginationOptions) => ({
  total_runs: {
    cardinality: { field: 'run_id' },
  },
  runs: {
    terms: {
      field: 'run_id',
      size: page * perPage,
      order: { latest_timestamp: 'desc' as const },
    },
    aggs: {
      latest_timestamp: { max: { field: '@timestamp' } },
      suite_id: { terms: { field: 'suite.id', size: 1 } },
      task_model_id: { terms: { field: 'task.model.id', size: 1 } },
      task_model_family: { terms: { field: 'task.model.family', size: 1 } },
      task_model_provider: { terms: { field: 'task.model.provider', size: 1 } },
      evaluator_model_id: { terms: { field: 'evaluator.model.id', size: 1 } },
      evaluator_model_family: { terms: { field: 'evaluator.model.family', size: 1 } },
      evaluator_model_provider: { terms: { field: 'evaluator.model.provider', size: 1 } },
      git_branch: { terms: { field: 'run_metadata.git_branch', size: 1 } },
      git_commit_sha: { terms: { field: 'run_metadata.git_commit_sha', size: 1 } },
      total_repetitions: { max: { field: 'run_metadata.total_repetitions' } },
      build_url: { terms: { field: 'ci.buildkite.build_url', size: 1 } },
    },
  },
});

/**
 * Parses the raw ES aggregation response from a runs listing query
 * into a typed array of run summaries with a total count.
 *
 * Because terms aggregations don't support offset, the aggregation
 * over-fetches and this function slices to the requested page window.
 */
export const parseRunsListingResponse = (
  aggregations: Record<string, unknown> | undefined,
  { page, perPage }: RunsListingPaginationOptions
): RunsListingResult => {
  const aggs: RunsListingAggregations | undefined = aggregations
    ? (aggregations as RunsListingAggregations)
    : undefined;
  const totalRuns = aggs?.total_runs?.value ?? 0;
  const allBuckets = aggs?.runs?.buckets ?? [];
  const offset = (page - 1) * perPage;
  const runBuckets = allBuckets.slice(offset, offset + perPage);

  const runs = runBuckets.map((bucket) => {
    const taskFamily = firstBucket(bucket.task_model_family);
    const taskProvider = firstBucket(bucket.task_model_provider);
    const evalFamily = firstBucket(bucket.evaluator_model_family);
    const evalProvider = firstBucket(bucket.evaluator_model_provider);

    return {
      run_id: bucket.key,
      timestamp: bucket.latest_timestamp?.value_as_string,
      suite_id: firstBucket(bucket.suite_id),
      task_model: {
        id: buildModelDisplayId(firstBucket(bucket.task_model_id), taskFamily, taskProvider),
        family: taskFamily,
        provider: taskProvider,
      },
      evaluator_model: {
        id: buildModelDisplayId(firstBucket(bucket.evaluator_model_id), evalFamily, evalProvider),
        family: evalFamily,
        provider: evalProvider,
      },
      git_branch: firstBucket(bucket.git_branch) ?? null,
      git_commit_sha: firstBucket(bucket.git_commit_sha) ?? null,
      total_repetitions: bucket.total_repetitions?.value ?? 1,
      ci: {
        build_url: firstBucket(bucket.build_url),
      },
    };
  });

  return { runs, total: totalRuns };
};

// ---------------------------------------------------------------------------
// Run detail response parser
// ---------------------------------------------------------------------------

interface StatsAggregations {
  by_dataset?: {
    buckets?: Array<{
      key: string;
      dataset_name?: TermsBucket;
      by_evaluator?: {
        buckets?: Array<{
          key: string;
          score_stats?: {
            avg?: number;
            std_deviation?: number;
            min?: number;
            max?: number;
            count?: number;
          };
          score_median?: { values?: Record<string, number | null> };
        }>;
      };
    }>;
  };
}

export interface RunDetailEvaluatorStat {
  dataset_id: string;
  dataset_name: string;
  evaluator_name: string;
  stats: {
    mean: number;
    median: number;
    std_dev: number;
    min: number;
    max: number;
    count: number;
  };
}

/**
 * Parses the stats aggregation response from a run detail query
 * into a typed array of per-evaluator, per-dataset statistics.
 */
export const parseStatsAggregationResponse = (
  aggregations: Record<string, unknown> | undefined
): RunDetailEvaluatorStat[] => {
  const aggs = aggregations as StatsAggregations | undefined;
  const datasetBuckets = aggs?.by_dataset?.buckets ?? [];

  return datasetBuckets.flatMap((datasetBucket) => {
    const datasetId = datasetBucket.key;
    const datasetName = firstBucket(datasetBucket.dataset_name) ?? datasetId;
    const evaluatorBuckets = datasetBucket.by_evaluator?.buckets ?? [];

    return evaluatorBuckets.map((evaluatorBucket) => {
      const scoreStats = evaluatorBucket.score_stats;
      const median = evaluatorBucket.score_median?.values?.['50.0'];

      return {
        dataset_id: datasetId,
        dataset_name: datasetName,
        evaluator_name: evaluatorBucket.key,
        stats: {
          mean: scoreStats?.avg ?? 0,
          median: median ?? 0,
          std_dev: scoreStats?.std_deviation ?? 0,
          min: scoreStats?.min ?? 0,
          max: scoreStats?.max ?? 0,
          count: scoreStats?.count ?? 0,
        },
      };
    });
  });
};

// ---------------------------------------------------------------------------
// Model display helpers
// ---------------------------------------------------------------------------

/**
 * Derives a human-readable model identifier from its component parts.
 * Falls back through id -> provider/family -> family -> provider -> 'unknown'.
 */
export const buildModelDisplayId = (id?: string, family?: string, provider?: string): string => {
  if (id) return id;
  if (family && provider) return `${provider}/${family}`;
  return family ?? provider ?? 'unknown';
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const firstBucket = (agg: TermsBucket | undefined): string | undefined => agg?.buckets?.[0]?.key;
