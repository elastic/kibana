/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Model } from '@kbn/inference-common';
import { hostname } from 'os';
import { calculateEvaluatorStats } from './evaluation_stats';
import type { DatasetScoreWithStats } from './evaluation_stats';

/**
 * Represents a single evaluation result with explanation for display purposes.
 */
export interface EvaluationExplanation {
  /** Index of the example in the dataset */
  exampleIndex: number;
  /** Repetition number */
  repetition: number;
  /** The score (0-1 scale) */
  score: number | null;
  /** Label from the evaluator */
  label?: string | null;
  /** Explanation from the evaluator for the score */
  explanation?: string;
  /** Reasoning from the evaluator */
  reasoning?: string;
  /** Input question/prompt that was evaluated */
  inputQuestion?: string;
}

interface BulkDroppedDocument<TDocument> {
  status?: number;
  error?: {
    type?: string;
    reason?: string;
    caused_by?: unknown;
    root_cause?: unknown;
  };
  operation?: unknown;
  document?: TDocument;
}

export interface EvaluationScoreDocument {
  '@timestamp': string;
  run_id: string;
  experiment_id: string;

  /**
   * Optional CI metadata to correlate scores back to a suite and Buildkite build/job.
   * These fields are safe to omit in non-CI environments.
   */
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

  /** Per-example format: one document per evaluated example */
  example?: {
    id: string;
    index: number;
    dataset: {
      id: string;
      name: string;
    };
  };

  task?: {
    trace_id: string | null;
    repetition_index: number;
    model: Model;
  };

  /** Aggregated format: one document per dataset per evaluator */
  dataset?: {
    id: string;
    name: string;
    examples_count: number;
  };
  model?: Model;
  evaluator_model?: Model;
  repetitions?: number;

  evaluator: {
    name: string;
    /** Per-example format: single score and metadata */
    score?: number | null;
    label?: string | null;
    explanation?: string | null;
    metadata?: Record<string, unknown> | null;
    trace_id?: string | null;
    model?: Model;
    /** Aggregated format: stats and scores array */
    stats?: {
      mean: number;
      median: number;
      std_dev: number;
      min: number;
      max: number;
      count: number;
      percentage: number;
    };
    scores?: number[];
    /** Explanations for non-perfect scores (score < 1) */
    low_score_explanations?: EvaluationExplanation[];
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

type BuildkiteCiMetadata = NonNullable<NonNullable<EvaluationScoreDocument['ci']>['buildkite']>;

export interface ExportScoresOptions {
  /**
   * Optional suite identifier to attach to exported documents.
   *
   * Defaults to `process.env.EVAL_SUITE_ID`.
   */
  suiteId?: string;

  /**
   * Optional Buildkite CI metadata to attach to exported documents.
   *
   * Defaults to environment-derived Buildkite metadata (if any).
   */
  buildkite?: BuildkiteCiMetadata;
}

function getBuildkiteCiMetadataFromEnv(): BuildkiteCiMetadata | undefined {
  const pullRequest =
    process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false'
      ? process.env.BUILDKITE_PULL_REQUEST
      : undefined;

  const hasAnyBuildkiteMetadata =
    process.env.BUILDKITE_BUILD_ID ||
    process.env.BUILDKITE_JOB_ID ||
    process.env.BUILDKITE_BUILD_URL ||
    process.env.BUILDKITE_PIPELINE_SLUG ||
    pullRequest ||
    process.env.BUILDKITE_BRANCH ||
    process.env.BUILDKITE_COMMIT;

  if (!hasAnyBuildkiteMetadata) {
    return undefined;
  }

  return {
    build_id: process.env.BUILDKITE_BUILD_ID,
    job_id: process.env.BUILDKITE_JOB_ID,
    build_url: process.env.BUILDKITE_BUILD_URL,
    pipeline_slug: process.env.BUILDKITE_PIPELINE_SLUG,
    pull_request: pullRequest,
    branch: process.env.BUILDKITE_BRANCH,
    commit: process.env.BUILDKITE_COMMIT,
  };
}

/**
 * Statistics for a single evaluator on a single dataset.
 * This is the core data structure returned by ES aggregations and used throughout the reporting system.
 */
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
  taskModel: Model;
  evaluatorModel: Model;
  totalRepetitions: number;
}

interface RunStatsAggregations {
  by_dataset?: {
    buckets?: Array<{
      key: string;
      dataset_name?: { buckets?: Array<{ key: string }> };
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
          // Captured by percentiles aggregation opposed to the extended_stats aggregation used for the above
          score_median?: { values?: Record<string, number> };
        }>;
      };
    }>;
  };
}

/**
 * Transforms evaluation score documents from ES into DatasetScoreWithStats.
 * Handles both (1) per-example documents with example/task/evaluator.score and
 * (2) aggregated documents with dataset/evaluator.stats/evaluator.scores.
 */
export function parseScoreDocuments(
  documents: EvaluationScoreDocument[]
): import('./evaluation_stats').DatasetScoreWithStats[] {
  const datasetMap = new Map<string, import('./evaluation_stats').DatasetScoreWithStats>();

  for (const doc of documents) {
    const evaluator = doc.evaluator;
    if (!evaluator) continue;

    // Path 1: Aggregated format (dataset + evaluator.stats + evaluator.scores)
    const dataset = doc.dataset;
    if (dataset && evaluator.stats && evaluator.scores) {
      if (!datasetMap.has(dataset.id)) {
        datasetMap.set(dataset.id, {
          id: dataset.id,
          name: dataset.name,
          numExamples: dataset.examples_count,
          evaluatorScores: new Map(),
          evaluatorExplanations: new Map(),
          evaluatorStats: new Map(),
          experimentId: doc.experiment_id,
        });
      }
      const datasetEntry = datasetMap.get(dataset.id)!;
      datasetEntry.evaluatorScores.set(evaluator.name, evaluator.scores);
      datasetEntry.evaluatorStats.set(evaluator.name, {
        mean: evaluator.stats.mean,
        median: evaluator.stats.median,
        stdDev: evaluator.stats.std_dev,
        min: evaluator.stats.min,
        max: evaluator.stats.max,
        count: evaluator.stats.count,
        percentage: evaluator.stats.percentage,
      });
      if (evaluator.low_score_explanations?.length) {
        datasetEntry.evaluatorExplanations.set(evaluator.name, evaluator.low_score_explanations);
      }
      continue;
    }

    // Path 2: Per-example format (example + task + evaluator.score)
    const example = doc.example;
    if (example && evaluator.score != null) {
      const datasetId = example.dataset.id;
      const datasetName = example.dataset.name;
      if (!datasetMap.has(datasetId)) {
        datasetMap.set(datasetId, {
          id: datasetId,
          name: datasetName,
          numExamples: 0,
          evaluatorScores: new Map(),
          evaluatorExplanations: new Map(),
          evaluatorStats: new Map(),
          experimentId: doc.experiment_id,
        });
      }
      const datasetEntry = datasetMap.get(datasetId)!;
      const scores = datasetEntry.evaluatorScores.get(evaluator.name) ?? [];
      scores.push(evaluator.score);
      datasetEntry.evaluatorScores.set(evaluator.name, scores);
      if (evaluator.score < 1 && evaluator.explanation) {
        const explanations = datasetEntry.evaluatorExplanations.get(evaluator.name) ?? [];
        explanations.push({
          exampleIndex: example.index,
          repetition: doc.task?.repetition_index ?? 0,
          score: evaluator.score,
          label: evaluator.label ?? undefined,
          explanation: evaluator.explanation,
        });
        datasetEntry.evaluatorExplanations.set(evaluator.name, explanations);
      }
    }
  }

  // Compute stats for per-example aggregated data (aggregated path already has stats)
  for (const datasetEntry of datasetMap.values()) {
    datasetEntry.evaluatorScores.forEach((scores, evaluatorName) => {
      if (!datasetEntry.evaluatorStats.has(evaluatorName)) {
        const totalExamples = datasetEntry.numExamples || scores.length;
        const stats = calculateEvaluatorStats(scores, totalExamples);
        datasetEntry.evaluatorStats.set(evaluatorName, stats);
      }
    });
    const maxCount = Math.max(
      datasetEntry.numExamples,
      ...Array.from(datasetEntry.evaluatorScores.values()).map((s) => s.length),
      0
    );
    if (datasetEntry.numExamples === 0) {
      datasetEntry.numExamples = maxCount;
    }
  }

  return Array.from(datasetMap.values());
}

const EVALUATIONS_DATA_STREAM_ALIAS = 'kibana-evaluations';
const EVALUATIONS_DATA_STREAM_WILDCARD = 'kibana-evaluations*';
const EVALUATIONS_DATA_STREAM_TEMPLATE = 'kibana-evaluations-template';
export class EvaluationScoreRepository {
  constructor(private readonly esClient: EsClient, private readonly log: SomeDevLog) {}

  private async ensureIndexTemplate(): Promise<void> {
    const templateBody = {
      index_patterns: [EVALUATIONS_DATA_STREAM_WILDCARD],
      data_stream: {},
      template: {
        settings: {
          refresh_interval: '5s',
        },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            run_id: { type: 'keyword' },
            experiment_id: { type: 'keyword' },
            suite: {
              type: 'object',
              properties: {
                id: { type: 'keyword' },
              },
            },
            ci: {
              type: 'object',
              properties: {
                buildkite: {
                  type: 'object',
                  properties: {
                    build_id: { type: 'keyword' },
                    job_id: { type: 'keyword' },
                    build_url: { type: 'keyword' },
                    pipeline_slug: { type: 'keyword' },
                    pull_request: { type: 'keyword' },
                    branch: { type: 'keyword' },
                    commit: { type: 'keyword' },
                  },
                },
              },
            },
            example: {
              type: 'object',
              properties: {
                id: { type: 'keyword' },
                index: { type: 'integer' },
                dataset: {
                  type: 'object',
                  properties: {
                    id: { type: 'keyword' },
                    name: { type: 'keyword' },
                  },
                },
              },
            },
            task: {
              type: 'object',
              properties: {
                trace_id: { type: 'keyword' },
                repetition_index: { type: 'integer' },
                model: {
                  type: 'object',
                  properties: {
                    id: { type: 'keyword' },
                    family: { type: 'keyword' },
                    provider: { type: 'keyword' },
                  },
                },
              },
            },
            evaluator: {
              type: 'object',
              properties: {
                name: { type: 'keyword' },
                score: { type: 'float' },
                label: { type: 'keyword' },
                explanation: { type: 'text', index: false },
                metadata: { type: 'flattened' },
                trace_id: { type: 'keyword' },
                model: {
                  type: 'object',
                  properties: {
                    id: { type: 'keyword' },
                    family: { type: 'keyword' },
                    provider: { type: 'keyword' },
                  },
                },
                scores: {
                  type: 'float',
                  index: false,
                },
                low_score_explanations: {
                  type: 'nested',
                  properties: {
                    exampleIndex: { type: 'integer' },
                    repetition: { type: 'integer' },
                    score: { type: 'float' },
                    label: { type: 'keyword' },
                    explanation: { type: 'text', index: false },
                    reasoning: { type: 'text', index: false },
                    inputQuestion: { type: 'text', index: false },
                  },
                },
              },
            },
            run_metadata: {
              type: 'object',
              properties: {
                git_branch: { type: 'keyword' },
                git_commit_sha: { type: 'keyword' },
                total_repetitions: { type: 'integer' },
              },
            },
            environment: {
              type: 'object',
              properties: {
                hostname: { type: 'keyword' },
              },
            },
          },
        },
      },
    };

    try {
      const templateExists = await this.esClient.indices
        .existsIndexTemplate({
          name: EVALUATIONS_DATA_STREAM_TEMPLATE,
        })
        .catch(() => false);

      if (!templateExists) {
        await this.esClient.indices.putIndexTemplate({
          name: EVALUATIONS_DATA_STREAM_TEMPLATE,
          index_patterns: templateBody.index_patterns,
          data_stream: templateBody.data_stream,
          template: templateBody.template as any,
        });

        this.log.debug('Created Elasticsearch index template for evaluation scores');
      }
    } catch (error) {
      this.log.error('Failed to create index template:', error);
      throw error;
    }
  }

  private async ensureDatastream(): Promise<void> {
    try {
      await this.esClient.indices.getDataStream({
        name: EVALUATIONS_DATA_STREAM_ALIAS,
      });
    } catch (error: any) {
      if (error?.statusCode === 404) {
        await this.esClient.indices.createDataStream({
          name: EVALUATIONS_DATA_STREAM_ALIAS,
        });
        this.log.debug(`Created datastream: ${EVALUATIONS_DATA_STREAM_ALIAS}`);
      } else {
        throw error;
      }
    }
  }

  async exportScores(
    documents: EvaluationScoreDocument[],
    options: ExportScoresOptions = {}
  ): Promise<void> {
    try {
      await this.ensureIndexTemplate();
      await this.ensureDatastream();

      if (documents.length === 0) {
        this.log.warning('No evaluation scores to export');
        return;
      }

      const buildkite = options.buildkite ?? getBuildkiteCiMetadataFromEnv();
      const suiteId = options.suiteId ?? process.env.EVAL_SUITE_ID;
      const enrichedDocuments =
        suiteId || buildkite
          ? documents.map((doc) => ({
              ...doc,
              suite: doc.suite ?? (suiteId ? { id: suiteId } : undefined),
              ci: doc.ci ?? (buildkite ? { buildkite } : undefined),
            }))
          : documents;

      // Bulk index documents
      if (enrichedDocuments.length > 0) {
        const dropped: Array<BulkDroppedDocument<EvaluationScoreDocument>> = [];
        const timestamp = new Date().toISOString();

        const stats = await this.esClient.helpers.bulk({
          datasource: enrichedDocuments,
          onDocument: (doc) => {
            const suiteIdPart = doc.suite?.id ?? 'unknown-suite';
            const taskModelIdPart = doc.task?.model.id ?? 'unknown';
            const docId =
              doc.example && doc.task
                ? [
                    doc.run_id,
                    suiteIdPart,
                    taskModelIdPart,
                    doc.example.dataset.id,
                    doc.example.id,
                    doc.evaluator.name,
                    doc.task.repetition_index,
                  ].join('-')
                : '';

            return {
              // Data streams only allow create operations. Use deterministic document IDs so:
              // - Re-runs/retries don't create duplicates (they'll 409 conflict instead)
              // - We can treat 409s as a no-op for idempotency
              create: {
                _index: EVALUATIONS_DATA_STREAM_ALIAS,
                _id:
                  doc.example && doc.task
                    ? docId
                    : `${doc.environment.hostname}-${doc.model?.id ?? 'unknown'}-${
                        doc.experiment_id
                      }-${doc.dataset?.id}-${doc.evaluator.name}-${timestamp}`,
              },
            };
          },
          onDrop: (droppedDoc) => {
            dropped.push(droppedDoc as BulkDroppedDocument<EvaluationScoreDocument>);
          },
          refresh: 'wait_for',
        });

        // Check for bulk operation errors
        if (stats.failed > 0) {
          // `helpers.bulk` counts any dropped operation as failed, including expected 409 conflicts
          // when re-exporting the same deterministic IDs. Ignore 409s to keep exports idempotent.
          //
          // Note: In the unlikely event that `helpers.bulk` reports `failed > 0` but does not call
          // `onDrop`, fall back to failing with an "unknown" reason.
          if (dropped.length === 0) {
            const firstErrorSummary = 'unknown failure reason';
            this.log.error(
              `Bulk indexing had ${stats.failed} failed operations out of ${stats.total}. ` +
                `First error: ${firstErrorSummary}`
            );

            throw new Error(
              `Bulk indexing failed: ${stats.failed} of ${stats.total} operations failed. ` +
                `First error: ${firstErrorSummary}`
            );
          }

          const conflicts = dropped.filter((d) => d.status === 409);
          const nonConflictDropped = dropped.filter((d) => d.status !== 409);

          if (nonConflictDropped.length === 0) {
            this.log.debug(
              `Bulk indexing had ${conflicts.length} 409 conflicts out of ${stats.total} operations (ignored)`
            );
            this.log.debug(
              `Successfully indexed ${stats.successful} evaluation scores (${conflicts.length} already existed)`
            );
            return;
          }

          const first = nonConflictDropped[0];
          const firstErrorSummary = first.error
            ? `${first.status ?? 'unknown status'} ${first.error.type ?? 'unknown type'}: ${
                first.error.reason ?? 'unknown reason'
              }`
            : 'unknown failure reason';

          this.log.error(
            `Bulk indexing had ${nonConflictDropped.length} failed operations out of ${stats.total} ` +
              `(${conflicts.length} conflicts ignored). First error: ${firstErrorSummary}`
          );

          throw new Error(
            `Bulk indexing failed: ${nonConflictDropped.length} of ${stats.total} operations failed ` +
              `(${conflicts.length} conflicts ignored). First error: ${firstErrorSummary}`
          );
        }

        this.log.debug(`Successfully indexed ${stats.successful} evaluation scores`);
      }
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      this.log.error('Failed to export scores to Elasticsearch', cause);
      throw cause;
    }
  }

  /**
   * Exports aggregated evaluation scores from DatasetScoreWithStats.
   * Creates one document per dataset per evaluator with stats and scores array.
   */
  async exportAggregatedScores({
    datasetScoresWithStats,
    runId,
    model,
    evaluatorModel,
  }: {
    datasetScoresWithStats: DatasetScoreWithStats[];
    runId: string;
    model: Model;
    evaluatorModel: Model;
  }): Promise<void> {
    const documents: EvaluationScoreDocument[] = [];
    const timestamp = new Date().toISOString();

    for (const dataset of datasetScoresWithStats) {
      for (const [evaluatorName, stats] of dataset.evaluatorStats.entries()) {
        const scores = dataset.evaluatorScores.get(evaluatorName) || [];
        if (stats.count === 0) {
          continue;
        }

        const lowScoreExplanations = dataset.evaluatorExplanations?.get(evaluatorName) || [];

        documents.push({
          '@timestamp': timestamp,
          run_id: runId,
          experiment_id: dataset.experimentId,
          dataset: {
            id: dataset.id,
            name: dataset.name,
            examples_count: dataset.numExamples,
          },
          model: {
            id: model.id || 'unknown',
            family: model.family,
            provider: model.provider,
          },
          evaluator_model: evaluatorModel,
          evaluator: {
            name: evaluatorName,
            stats: {
              mean: stats.mean,
              median: stats.median,
              std_dev: stats.stdDev,
              min: stats.min,
              max: stats.max,
              count: stats.count,
              percentage: stats.percentage,
            },
            scores,
            low_score_explanations:
              lowScoreExplanations.length > 0 ? lowScoreExplanations.slice(0, 10) : undefined,
          },
          run_metadata: {
            git_branch: null,
            git_commit_sha: null,
            total_repetitions: stats.count,
          },
          environment: {
            hostname: hostname(),
          },
        });
      }
    }

    if (documents.length > 0) {
      await this.exportScores(documents);
    }
  }

  async getStatsByRunId(
    runId: string,
    options?: { taskModelId?: string; suiteId?: string }
  ): Promise<RunStats | null> {
    try {
      const must: Array<Record<string, unknown>> = [{ term: { run_id: runId } }];
      if (options?.taskModelId) {
        must.push({ term: { 'task.model.id': options.taskModelId } });
      }
      if (options?.suiteId) {
        must.push({ term: { 'suite.id': options.suiteId } });
      }

      const runQuery = { bool: { must } };

      const metadataResponse = await this.esClient.search<EvaluationScoreDocument>({
        index: EVALUATIONS_DATA_STREAM_ALIAS,
        query: runQuery,
        size: 1,
      });

      // Used for metedata for the evaluation run (all score documents capture the same metadata)
      const firstDoc = metadataResponse.hits?.hits[0]?._source;
      if (!firstDoc) {
        return null;
      }

      const aggResponse = await this.esClient.search({
        index: EVALUATIONS_DATA_STREAM_ALIAS,
        size: 0,
        query: runQuery,
        aggs: {
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
        },
      });

      const aggregations = aggResponse.aggregations as RunStatsAggregations | undefined;
      const datasetBuckets = aggregations?.by_dataset?.buckets ?? [];

      const stats = datasetBuckets.flatMap((datasetBucket) => {
        const datasetId = datasetBucket.key;
        const datasetName = datasetBucket.dataset_name?.buckets?.[0]?.key ?? datasetId;
        const evaluatorBuckets = datasetBucket.by_evaluator?.buckets ?? [];

        return evaluatorBuckets.map((evaluatorBucket) => {
          const scoreStats = evaluatorBucket.score_stats;
          const median = evaluatorBucket.score_median?.values?.['50.0'];

          return {
            datasetId,
            datasetName,
            evaluatorName: evaluatorBucket.key,
            stats: {
              mean: scoreStats?.avg ?? 0,
              median: median ?? 0,
              stdDev: scoreStats?.std_deviation ?? 0,
              min: scoreStats?.min ?? 0,
              max: scoreStats?.max ?? 0,
              count: scoreStats?.count ?? 0,
            },
          };
        });
      });

      return {
        stats,
        taskModel: firstDoc.task?.model ??
          firstDoc.model ?? { id: 'unknown', family: '', provider: '' },
        evaluatorModel: firstDoc.evaluator?.model ??
          firstDoc.evaluator_model ?? { id: 'unknown', family: '', provider: '' },
        totalRepetitions: firstDoc.run_metadata?.total_repetitions ?? 1,
      };
    } catch (error) {
      this.log.error(`Failed to retrieve stats for run ID ${runId}:`, error);
      return null;
    }
  }

  async getScoresByRunId(
    runId: string,
    options?: { taskModelId?: string; suiteId?: string }
  ): Promise<EvaluationScoreDocument[]> {
    try {
      const must: Array<Record<string, unknown>> = [{ term: { run_id: runId } }];
      if (options?.taskModelId) {
        must.push({ term: { 'task.model.id': options.taskModelId } });
      }
      if (options?.suiteId) {
        must.push({ term: { 'suite.id': options.suiteId } });
      }
      const query = { bool: { must } };

      const response = await this.esClient.search<EvaluationScoreDocument>({
        index: EVALUATIONS_DATA_STREAM_ALIAS,
        query,
        sort: [
          { 'example.dataset.name': { order: 'asc' as const } },
          { 'example.index': { order: 'asc' as const } },
          { 'evaluator.name': { order: 'asc' as const } },
          { 'task.repetition_index': { order: 'asc' as const } },
        ],
        size: 10000,
      });

      const hits = response.hits?.hits || [];
      const scores = hits
        .map((hit) => hit._source)
        .filter((source): source is EvaluationScoreDocument => source !== undefined);

      this.log.info(`Retrieved ${scores.length} scores for run ID: ${runId}`);
      return scores;
    } catch (error) {
      this.log.error(`Failed to retrieve scores for run ID ${runId}:`, error);
      return [];
    }
  }
}
