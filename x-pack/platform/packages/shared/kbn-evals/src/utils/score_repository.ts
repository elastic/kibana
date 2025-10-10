/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { hostname } from 'os';
import type { DatasetScoreWithStats } from './evaluation_stats';

interface ModelScoreDocument {
  '@timestamp': string;
  run_id: string;
  model: {
    id: string;
    family: string;
    provider: string;
  };
  dataset: {
    id: string;
    name: string;
    examples_count: number;
  };
  evaluator: {
    name: string;
    stats: {
      mean: number;
      median: number;
      std_dev: number;
      min: number;
      max: number;
      count: number;
      percentage: number;
    };
    scores: number[];
  };
  experiments: Array<{
    id?: string;
  }>;
  environment: {
    hostname: string;
  };
  tags: string[];
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
          refresh_interval: '30s',
          'index.hidden': true,
        },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            run_id: { type: 'keyword' },
            model: {
              type: 'object',
              properties: {
                id: { type: 'keyword' },
                family: { type: 'keyword' },
                provider: { type: 'keyword' },
              },
            },
            dataset: {
              type: 'object',
              properties: {
                id: { type: 'keyword' },
                name: { type: 'keyword' },
                examples_count: { type: 'integer' },
              },
            },
            evaluator: {
              type: 'object',
              properties: {
                name: { type: 'keyword' },
                stats: {
                  type: 'object',
                  properties: {
                    mean: { type: 'float' },
                    median: { type: 'float' },
                    std_dev: { type: 'float' },
                    min: { type: 'float' },
                    max: { type: 'float' },
                    count: { type: 'integer' },
                    percentage: { type: 'float' },
                  },
                },
                scores: {
                  type: 'float',
                  index: false,
                },
              },
            },
            experiments: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
              },
            },
            environment: {
              type: 'object',
              properties: {
                hostname: { type: 'keyword' },
              },
            },
            tags: { type: 'keyword' },
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

  async exportScores({
    datasetScoresWithStats,
    evaluatorNames,
    model,
    runId,
    tags = [],
  }: {
    datasetScoresWithStats: DatasetScoreWithStats[];
    evaluatorNames: string[];
    model: Model;
    runId: string;
    tags?: string[];
  }): Promise<void> {
    try {
      await this.ensureIndexTemplate();
      await this.ensureDatastream();

      if (datasetScoresWithStats.length === 0) {
        this.log.warning('No dataset scores found to export');
        return;
      }

      const documents: ModelScoreDocument[] = [];
      const timestamp = new Date().toISOString();

      for (const dataset of datasetScoresWithStats) {
        for (const evaluatorName of evaluatorNames) {
          const stats = dataset.evaluatorStats.get(evaluatorName);
          const scores = dataset.evaluatorScores.get(evaluatorName) || [];
          if (!stats || stats.count === 0) {
            continue;
          }

          const document: ModelScoreDocument = {
            '@timestamp': timestamp,
            run_id: runId,
            model: {
              id: model.id || 'unknown',
              family: model.family,
              provider: model.provider,
            },
            dataset: {
              id: dataset.id,
              name: dataset.name,
              examples_count: dataset.numExamples,
            },
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
            },
            experiments: dataset.experiments || [],
            environment: {
              hostname: hostname(),
            },
            tags,
          };

          documents.push(document);
        }
      }
      // Bulk index documents
      if (documents.length > 0) {
        const stats = await this.esClient.helpers.bulk({
          datasource: documents,
          onDocument: (doc) => {
            return {
              create: {
                _index: EVALUATIONS_DATA_STREAM_ALIAS,
                _id: `${doc.environment.hostname}-${doc.model.id}-${doc.dataset.id}-${doc.evaluator.name}-${timestamp}`,
              },
            };
          },
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

        this.log.success(
          `Successfully indexed evaluation results to a datastream: ${EVALUATIONS_DATA_STREAM_ALIAS}`
        );

        // Log summary information for easy querying
        this.log.info(`Export details:`);
        this.log.info(
          `  - Query filter: environment.hostname:"${hostname()}" AND model.id:"${
            model.id
          }" AND run_id:"${runId}"`
        );
        this.log.info(`  - Timestamp: ${timestamp}`);
        this.log.info(`  - Datasets: ${datasetScoresWithStats.map((d) => d.name).join(', ')}`);
        this.log.info(`  - Evaluators: ${evaluatorNames.join(', ')}`);
      }
    } catch (error) {
      this.log.error('Failed to export scores to Elasticsearch:', error);
      throw error;
    }
  }

  async getScoresByRunId(runId: string): Promise<ModelScoreDocument[]> {
    try {
      const query = {
        bool: {
          must: [{ term: { run_id: runId } }],
        },
      };

      const response = await this.esClient.search({
        index: EVALUATIONS_DATA_STREAM_WILDCARD,
        query,
        sort: [
          { 'dataset.name': { order: 'asc' as const } },
          { 'evaluator.name': { order: 'asc' as const } },
        ],
        size: 1000,
      });

      const hits = response.hits?.hits || [];
      const scores = hits.map((hit: any) => hit._source);

      this.log.info(`Retrieved ${scores.length} scores for run ID: ${runId}`);
      return scores;
    } catch (error) {
      this.log.error(`Failed to retrieve scores for run ID ${runId}:`, error);
      return [];
    }
  }
}
