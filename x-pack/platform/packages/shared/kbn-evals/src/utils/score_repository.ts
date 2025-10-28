/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { hostname } from 'os';
import type { DatasetScoreWithStats } from './evaluation_stats';
import type { EvaluationReport } from './report_model_score';

export interface EvaluationScoreDocument {
  '@timestamp': string;
  run_id: string;
  experiment_id: string;
  repetitions: number;
  model: {
    id: string;
    family: string;
    provider: string;
  };
  evaluator_model: {
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
  environment: {
    hostname: string;
  };
}

/**
 * Parses Elasticsearch EvaluationScoreDocuments to DatasetScoreWithStats array
 * This is the core transformation logic shared across different reporters
 */
export function parseScoreDocuments(documents: EvaluationScoreDocument[]): DatasetScoreWithStats[] {
  const datasetMap = new Map<string, DatasetScoreWithStats>();

  for (const doc of documents) {
    if (!datasetMap.has(doc.dataset.id)) {
      datasetMap.set(doc.dataset.id, {
        id: doc.dataset.id,
        name: doc.dataset.name,
        numExamples: doc.dataset.examples_count,
        evaluatorScores: new Map(),
        evaluatorStats: new Map(),
        experimentId: doc.experiment_id,
      });
    }

    const dataset = datasetMap.get(doc.dataset.id)!;

    dataset.evaluatorScores.set(doc.evaluator.name, doc.evaluator.scores);
    dataset.evaluatorStats.set(doc.evaluator.name, {
      mean: doc.evaluator.stats.mean,
      median: doc.evaluator.stats.median,
      stdDev: doc.evaluator.stats.std_dev,
      min: doc.evaluator.stats.min,
      max: doc.evaluator.stats.max,
      count: doc.evaluator.stats.count,
      percentage: doc.evaluator.stats.percentage,
    });
  }

  return Array.from(datasetMap.values());
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
            repetitions: { type: 'integer' },
            model: {
              type: 'object',
              properties: {
                id: { type: 'keyword' },
                family: { type: 'keyword' },
                provider: { type: 'keyword' },
              },
            },
            evaluator_model: {
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

  async exportScores({
    datasetScoresWithStats,
    model,
    evaluatorModel,
    runId,
    repetitions,
  }: EvaluationReport): Promise<void> {
    try {
      await this.ensureIndexTemplate();
      await this.ensureDatastream();

      if (datasetScoresWithStats.length === 0) {
        this.log.warning('No dataset scores found to export');
        return;
      }

      const documents: EvaluationScoreDocument[] = [];
      const timestamp = new Date().toISOString();

      for (const dataset of datasetScoresWithStats) {
        for (const [evaluatorName, stats] of dataset.evaluatorStats.entries()) {
          const scores = dataset.evaluatorScores.get(evaluatorName) || [];
          if (stats.count === 0) {
            continue;
          }

          const document: EvaluationScoreDocument = {
            '@timestamp': timestamp,
            run_id: runId,
            experiment_id: dataset.experimentId,
            repetitions,
            model: {
              id: model.id || 'unknown',
              family: model.family,
              provider: model.provider,
            },
            evaluator_model: {
              id: evaluatorModel.id || 'unknown',
              family: evaluatorModel.family,
              provider: evaluatorModel.provider,
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
            environment: {
              hostname: hostname(),
            },
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

        this.log.debug(
          `Successfully indexed evaluation results to a datastream: ${EVALUATIONS_DATA_STREAM_ALIAS}`
        );
      }
    } catch (error) {
      this.log.error('Failed to export scores to Elasticsearch:', error);
      throw error;
    }
  }

  async getScoresByRunId(runId: string): Promise<EvaluationScoreDocument[]> {
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
