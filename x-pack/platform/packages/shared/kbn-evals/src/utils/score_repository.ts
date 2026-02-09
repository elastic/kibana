/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Model } from '@kbn/inference-common';

export interface EvaluationScoreDocument {
  '@timestamp': string;
  run_id: string;
  experiment_id: string;

  example: {
    id: string;
    index: number;
    dataset: {
      id: string;
      name: string;
    };
  };

  task: {
    trace_id: string | null;
    repetition_index: number;
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

const EVALUATIONS_DATA_STREAM_ALIAS = '.kibana-evaluations';
const EVALUATIONS_DATA_STREAM_WILDCARD = '.kibana-evaluations*';
const EVALUATIONS_DATA_STREAM_TEMPLATE = 'kibana-evaluations-template';
export class EvaluationScoreRepository {
  constructor(private readonly esClient: EsClient, private readonly log: SomeDevLog) {}

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
        const stats = await this.esClient.helpers.bulk({
          datasource: documents,
          onDocument: (doc) => {
            const docId = [
              doc.run_id,
              doc.example.dataset.id,
              doc.example.id,
              doc.evaluator.name,
              doc.task.repetition_index,
            ].join('-');

            return {
              create: {
                _index: EVALUATIONS_DATA_STREAM_ALIAS,
                _id: docId,
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
        taskModel: firstDoc.task.model,
        evaluatorModel: firstDoc.evaluator.model,
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
