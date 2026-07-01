/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface ExperimentFilterOptions {
  suiteId?: string;
  modelId?: string;
  filterField?: 'experiment_id' | 'metadata.execution_id';
}

interface ExperimentsListingFilterOptions {
  suiteId?: string;
  modelId?: string;
  branch?: string;
  datasetId?: string;
  datasetName?: string;
  buildId?: string;
}

interface ExperimentsListingPaginationOptions {
  page: number;
  perPage: number;
}

interface TermsBucket {
  buckets?: Array<{ key: string }>;
}

interface ExperimentBucket {
  key: string;
  doc_count: number;
  latest_timestamp?: { value_as_string?: string };
  experiment_count?: { value?: number };
  experiment_name?: TermsBucket;
  suite_id?: TermsBucket;
  dataset_id?: TermsBucket;
  dataset_name?: TermsBucket;
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
  pull_request?: TermsBucket;
}

interface ExperimentsListingAggregations {
  total_experiments?: { value: number };
  experiments?: { buckets?: ExperimentBucket[] };
}

export interface ExperimentsListingResult {
  experiments: Array<{
    execution_id: string;
    experiment_id: string;
    experiment_name: string | null;
    experiment_count: number;
    timestamp: string | undefined;
    suite_id: string | undefined;
    dataset_ids: string[];
    dataset_names: string[];
    task_model: { id: string; family: string | undefined; provider: string | undefined };
    evaluator_model: { id: string; family: string | undefined; provider: string | undefined };
    git_branch: string | null;
    git_commit_sha: string | null;
    total_repetitions: number;
    ci: { build_url: string | undefined; pull_request: string | undefined };
  }>;
  total: number;
}

// ---------------------------------------------------------------------------
// Single-experiment filter query
// ---------------------------------------------------------------------------

/**
 * Builds a bool/must query that filters evaluation score documents by experiment ID
 * with optional suite and task model filters.
 */
export const buildExperimentFilterQuery = (
  experimentId: string,
  options?: ExperimentFilterOptions
): { bool: { must: Array<Record<string, unknown>> } } => {
  const field = options?.filterField ?? 'experiment_id';
  const must: Array<Record<string, unknown>> = [{ term: { [field]: experimentId } }];
  if (options?.suiteId) {
    must.push({ term: { 'metadata.suite_id': options.suiteId } });
  }
  if (options?.modelId) {
    must.push({ term: { 'task.model.id': options.modelId } });
  }
  return { bool: { must } };
};

/**
 * Builds a bool/must query that filters evaluation score documents by example ID.
 */
export const buildExampleScoresQuery = (
  exampleId: string
): { bool: { must: Array<Record<string, unknown>> } } => ({
  bool: {
    must: [{ term: { 'example.id': exampleId } }],
  },
});

/**
 * Builds a bool/must query that filters evaluation score documents by
 * dataset ID and experiment ID (or metadata.execution_id when filterField is specified).
 */
export const buildDatasetExampleScoresQuery = (
  datasetId: string,
  experimentId: string,
  options?: { filterField?: 'experiment_id' | 'metadata.execution_id' }
): { bool: { must: Array<Record<string, unknown>> } } => {
  const field = options?.filterField ?? 'experiment_id';
  return {
    bool: {
      must: [{ term: { 'example.dataset.id': datasetId } }, { term: { [field]: experimentId } }],
    },
  };
};

// ---------------------------------------------------------------------------
// Per-experiment stats aggregation
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
      example_count: { cardinality: { field: 'example.id' } },
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
// Experiments listing query, aggregation, and response parser
// ---------------------------------------------------------------------------

const PREFLIGHT_EXPERIMENT_ID = 'kbn-evals-preflight';

/**
 * Builds the filter query for the experiments listing endpoint.
 * Supports optional suite, model, and branch filters.
 * Always excludes preflight check experiments.
 */
export const buildExperimentsListingFilterQuery = (
  options?: ExperimentsListingFilterOptions
): Record<string, unknown> => {
  const filters: Array<Record<string, unknown>> = [];

  if (options?.suiteId) {
    filters.push({ term: { 'metadata.suite_id': options.suiteId } });
  }
  if (options?.modelId) {
    filters.push({ term: { 'task.model.id': options.modelId } });
  }
  if (options?.branch) {
    filters.push({
      wildcard: {
        'metadata.git.branch': {
          value: `*${options.branch}*`,
          case_insensitive: true,
        },
      },
    });
  }
  if (options?.datasetId) {
    filters.push({ term: { 'example.dataset.id': options.datasetId } });
  }
  if (options?.datasetName) {
    filters.push({ term: { 'example.dataset.name': options.datasetName } });
  }
  if (options?.buildId) {
    filters.push({ term: { 'metadata.ci.build_id': options.buildId } });
  }
  return {
    bool: {
      must_not: [{ term: { experiment_id: PREFLIGHT_EXPERIMENT_ID } }],
      ...(filters.length > 0 ? { filter: filters } : {}),
    },
  };
};

/**
 * Returns the aggregation definition for listing experiments with summary metadata.
 * Groups score documents by experiment_id and extracts the latest timestamp,
 * model info, git metadata, and CI info for each experiment.
 *
 * Terms aggregations don't support a native offset, so we over-fetch
 * (page * perPage buckets) and let `parseExperimentsListingResponse` slice the
 * correct window.
 */
export const buildExperimentsListingAggregation = ({
  page,
  perPage,
}: ExperimentsListingPaginationOptions) => ({
  total_experiments: {
    cardinality: { field: 'metadata.execution_id' },
  },
  experiments: {
    terms: {
      field: 'metadata.execution_id',
      size: page * perPage,
      order: { latest_timestamp: 'desc' as const },
    },
    aggs: {
      latest_timestamp: { max: { field: '@timestamp' } },
      experiment_count: { cardinality: { field: 'experiment_id' } },
      experiment_name: { terms: { field: 'experiment_name', size: 1 } },
      suite_id: { terms: { field: 'metadata.suite_id', size: 1 } },
      dataset_id: { terms: { field: 'example.dataset.id', size: 50 } },
      dataset_name: { terms: { field: 'example.dataset.name', size: 50 } },
      task_model_id: { terms: { field: 'task.model.id', size: 1 } },
      task_model_family: { terms: { field: 'task.model.family', size: 1 } },
      task_model_provider: { terms: { field: 'task.model.provider', size: 1 } },
      evaluator_model_id: { terms: { field: 'evaluator.model.id', size: 1 } },
      evaluator_model_family: { terms: { field: 'evaluator.model.family', size: 1 } },
      evaluator_model_provider: { terms: { field: 'evaluator.model.provider', size: 1 } },
      git_branch: { terms: { field: 'metadata.git.branch', size: 1 } },
      git_commit_sha: { terms: { field: 'metadata.git.commit_sha', size: 1 } },
      total_repetitions: { max: { field: 'metadata.total_repetitions' } },
      build_url: { terms: { field: 'metadata.ci.build_url', size: 1 } },
      pull_request: { terms: { field: 'metadata.ci.pull_request', size: 1 } },
    },
  },
});

/**
 * Parses the raw ES aggregation response from an experiments listing query
 * into a typed array of experiment summaries with a total count.
 *
 * Because terms aggregations don't support offset, the aggregation
 * over-fetches and this function slices to the requested page window.
 */
export const parseExperimentsListingResponse = (
  aggregations: Record<string, unknown> | undefined,
  { page, perPage }: ExperimentsListingPaginationOptions
): ExperimentsListingResult => {
  const aggs: ExperimentsListingAggregations | undefined = aggregations
    ? (aggregations as ExperimentsListingAggregations)
    : undefined;
  const totalExperiments = aggs?.total_experiments?.value ?? 0;
  const allBuckets = aggs?.experiments?.buckets ?? [];
  const offset = (page - 1) * perPage;
  const experimentBuckets = allBuckets.slice(offset, offset + perPage);

  const experiments = experimentBuckets.map((bucket) => {
    const taskFamily = firstBucket(bucket.task_model_family);
    const taskProvider = firstBucket(bucket.task_model_provider);
    const evalFamily = firstBucket(bucket.evaluator_model_family);
    const evalProvider = firstBucket(bucket.evaluator_model_provider);

    return {
      execution_id: bucket.key,
      experiment_id: bucket.key,
      experiment_name: firstBucket(bucket.experiment_name) ?? null,
      experiment_count: bucket.experiment_count?.value ?? 1,
      timestamp: bucket.latest_timestamp?.value_as_string,
      suite_id: firstBucket(bucket.suite_id),
      dataset_ids: allBucketKeys(bucket.dataset_id),
      dataset_names: allBucketKeys(bucket.dataset_name),
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
        pull_request: firstBucket(bucket.pull_request),
      },
    };
  });

  return { experiments, total: totalExperiments };
};

// ---------------------------------------------------------------------------
// Experiment detail response parser
// ---------------------------------------------------------------------------

interface StatsAggregations {
  by_dataset?: {
    buckets?: Array<{
      key: string;
      dataset_name?: TermsBucket;
      example_count?: { value?: number | null };
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

export interface ExperimentDetailEvaluatorStat {
  dataset_id: string;
  dataset_name: string;
  evaluator_name: string;
  example_count: number;
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
 * Parses the stats aggregation response from an experiment detail query
 * into a typed array of per-evaluator, per-dataset statistics.
 */
export const parseStatsAggregationResponse = (
  aggregations: Record<string, unknown> | undefined
): ExperimentDetailEvaluatorStat[] => {
  const aggs = aggregations as StatsAggregations | undefined;
  const datasetBuckets = aggs?.by_dataset?.buckets ?? [];

  return datasetBuckets.flatMap((datasetBucket) => {
    const datasetId = datasetBucket.key;
    const datasetName = firstBucket(datasetBucket.dataset_name) ?? datasetId;
    const exampleCount = datasetBucket.example_count?.value ?? 0;
    const evaluatorBuckets = datasetBucket.by_evaluator?.buckets ?? [];

    return evaluatorBuckets.map((evaluatorBucket) => {
      const scoreStats = evaluatorBucket.score_stats;
      const median = evaluatorBucket.score_median?.values?.['50.0'];

      return {
        dataset_id: datasetId,
        dataset_name: datasetName,
        evaluator_name: evaluatorBucket.key,
        example_count: exampleCount,
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
const allBucketKeys = (agg: TermsBucket | undefined): string[] =>
  agg?.buckets?.map((b) => b.key) ?? [];
