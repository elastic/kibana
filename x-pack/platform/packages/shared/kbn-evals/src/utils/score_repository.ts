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

export interface EvaluationScoreDocument {
  '@timestamp': string;
  run_id: string;
  experiment_id: string;

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
  const datasetMap = new Map<
    string,
    import('./evaluation_stats').DatasetScoreWithStats
  >();

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

const EVALUATIONS_DATA_STREAM_ALIAS = '.kibana-evaluations';
const EVALUATIONS_DATA_STREAM_WILDCARD = '.kibana-evaluations*';
const EVALUATIONS_DATA_STREAM_TEMPLATE = 'kibana-evaluations-template';
export class EvaluationScoreRepository {
  constructor(private readonly esClient: EsClient, private readonly log: SomeDevLog) { }

  private async ensureIndexTemplate(): Promise<void> {
    const templateBody = {
      index_patterns: [EVALUATIONS_DATA_STREAM_WILDCARD],
      data_stream: {
        hidden: true,
      },
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          refresh_interval: '5s',
          'index.hidden': true,
        },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            run_id: { type: 'keyword' },
            experiment_id: { type: 'keyword' },
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
      // Check if datastream exists by trying to get it
      await this.esClient.indices.getDataStream({
        name: EVALUATIONS_DATA_STREAM_ALIAS,
      });
    } catch (error: any) {
      if (error?.statusCode === 404) {
        // Datastream doesn't exist, create it
        await this.esClient.indices.createDataStream({
          name: EVALUATIONS_DATA_STREAM_ALIAS,
        });
        this.log.debug(`Created datastream: ${EVALUATIONS_DATA_STREAM_ALIAS}`);
      } else {
        throw error;
      }
    }
  }

  async exportScores(documents: EvaluationScoreDocument[]): Promise<void> {
    try {
      await this.ensureIndexTemplate();
      await this.ensureDatastream();

      if (documents.length === 0) {
        this.log.warning('No evaluation scores to export');
        return;
      }

      // Bulk index documents
      if (documents.length > 0) {
        const timestamp = new Date().toISOString();
        const stats = await this.esClient.helpers.bulk({
          datasource: documents,
          onDocument: (doc) => {
            const docId =
              doc.example && doc.task
                ? [
                    doc.run_id,
                    doc.example.dataset.id,
                    doc.example.id,
                    doc.evaluator.name,
                    doc.task.repetition_index,
                  ].join('-')
                : '';

            return {
              create: {
                _index: EVALUATIONS_DATA_STREAM_ALIAS,
                _id:
                  doc.example && doc.task
                    ? docId
                    : `${doc.environment.hostname}-${doc.model?.id ?? 'unknown'}-${doc.experiment_id}-${doc.dataset?.id}-${doc.evaluator.name}-${timestamp}`,
              },
            };
          },
          refresh: 'wait_for',
        });

        // Check for bulk operation errors
        if (stats.failed > 0) {
          this.log.error(
            `Bulk indexing had ${stats.failed} failed operations out of ${stats.total}`
          );
          throw new Error(
            `Bulk indexing failed: ${stats.failed} of ${stats.total} operations failed`
          );
        }

        this.log.debug(`Successfully indexed ${stats.successful} evaluation scores`);
      }
    } catch (error) {
      this.log.error('Failed to export scores to Elasticsearch:', error);
      throw error;
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

  async getStatsByRunId(runId: string): Promise<RunStats | null> {
    try {
      const runQuery = { term: { run_id: runId } };

      const metadataResponse = await this.esClient.search<EvaluationScoreDocument>({
        index: EVALUATIONS_DATA_STREAM_WILDCARD,
        query: runQuery,
        size: 1,
      });

      // Used for metedata for the evaluation run (all score documents capture the same metadata)
      const firstDoc = metadataResponse.hits?.hits[0]?._source;
      if (!firstDoc) {
        return null;
      }

      const aggResponse = await this.esClient.search({
        index: EVALUATIONS_DATA_STREAM_WILDCARD,
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
        taskModel: firstDoc.task?.model ?? firstDoc.model ?? { id: 'unknown', family: '', provider: '' },
        evaluatorModel: firstDoc.evaluator?.model ?? firstDoc.evaluator_model ?? { id: 'unknown', family: '', provider: '' },
        totalRepetitions: firstDoc.run_metadata?.total_repetitions ?? 1,
      };
    } catch (error) {
      this.log.error(`Failed to retrieve stats for run ID ${runId}:`, error);
      return null;
    }
  }

  async getScoresByRunId(runId: string): Promise<EvaluationScoreDocument[]> {
    try {
      const query = {
        bool: {
          must: [{ term: { run_id: runId } }],
        },
      };

      const response = await this.esClient.search<EvaluationScoreDocument>({
        index: EVALUATIONS_DATA_STREAM_WILDCARD,
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
