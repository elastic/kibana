/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import type { RanExperiment } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { keyBy, uniq } from 'lodash';
import { mean, median, deviation, min, max } from 'd3';
import { hostname } from 'os';
import type { KibanaPhoenixClient } from '../kibana_phoenix_client/client';

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
  };
  experiments: Array<{
    id?: string;
  }>;
  environment: {
    hostname: string;
  };
  tags: string[];
}

interface DatasetScore {
  id: string;
  name: string;
  numExamples: number;
  evaluatorScores: Map<string, number[]>;
  experiments: Array<{
    id?: string;
  }>;
}

interface EvaluatorStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

const ELASTICSEARCH_INDEX = '.kibana-evals-scores';

export class ScoreExporter {
  constructor(private readonly esClient: EsClient, private readonly log: SomeDevLog) {}

  private async ensureIndexTemplate(): Promise<void> {
    const templateBody = {
      index_patterns: [ELASTICSEARCH_INDEX],
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          refresh_interval: '30s',
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
          name: 'kibana-evals-scores-template',
        })
        .then(() => true)
        .catch(() => false);

      if (!templateExists) {
        await this.esClient.indices.putIndexTemplate({
          name: 'kibana-evals-scores-template',
          index_patterns: templateBody.index_patterns,
          template: templateBody.template as any,
        });

        this.log.info('Created Elasticsearch index template for evaluation scores');
      }
    } catch (error) {
      this.log.error('Failed to create index template:', error);
      throw error;
    }
  }

  private processExperiments(
    experiments: RanExperiment[],
    phoenixClient: KibanaPhoenixClient,
    datasetInfosById: Record<string, any>
  ): DatasetScore[] {
    const datasetScoresMap = new Map<string, DatasetScore>();

    for (const experiment of experiments) {
      const { datasetId, evaluationRuns, runs } = experiment;

      const numExamplesForExperiment = runs ? Object.keys(runs).length : 0;

      if (!datasetScoresMap.has(datasetId)) {
        datasetScoresMap.set(datasetId, {
          id: datasetId,
          name: datasetInfosById[datasetId]?.name ?? datasetId,
          numExamples: 0,
          evaluatorScores: new Map<string, number[]>(),
          experiments: [],
        });
      }

      const datasetScore = datasetScoresMap.get(datasetId)!;
      datasetScore.numExamples += numExamplesForExperiment;

      // Add experiment info if not already present
      const experimentInfo = {
        id: experiment.id,
      };
      const existingExperiment = datasetScore.experiments.find(
        (exp) => exp.id === experimentInfo.id
      );
      if (!existingExperiment) {
        datasetScore.experiments.push(experimentInfo);
      }

      if (evaluationRuns) {
        evaluationRuns.forEach((evalRun) => {
          const score = evalRun.result?.score ?? 0;

          if (!datasetScore.evaluatorScores.has(evalRun.name)) {
            datasetScore.evaluatorScores.set(evalRun.name, []);
          }

          datasetScore.evaluatorScores.get(evalRun.name)!.push(score);
        });
      }
    }

    return Array.from(datasetScoresMap.values());
  }

  private calculateStats(scores: number[], totalExamples: number): EvaluatorStats {
    if (scores.length === 0) {
      return {
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        count: 0,
        percentage: 0,
      };
    }

    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    return {
      mean: mean(scores) ?? 0,
      median: median(scores) ?? 0,
      stdDev: deviation(scores) ?? 0,
      min: min(scores) ?? 0,
      max: max(scores) ?? 0,
      count: scores.length,
      percentage: totalExamples > 0 ? totalScore / totalExamples : 0,
    };
  }

  async exportScores({
    phoenixClient,
    model,
    experiments,
    runId,
    tags = [],
  }: {
    phoenixClient: KibanaPhoenixClient;
    model: Model;
    experiments: RanExperiment[];
    runId: string;
    tags?: string[];
  }): Promise<void> {
    try {
      await this.ensureIndexTemplate();

      if (experiments.length === 0) {
        this.log.warning('No experiments found to export');
        return;
      }

      const allDatasetIds = uniq(experiments.flatMap((experiment) => experiment.datasetId));
      const datasetInfos = await phoenixClient.getDatasets(allDatasetIds);
      const datasetInfosById = keyBy(datasetInfos, (datasetInfo) => datasetInfo.id);

      const datasetScores = this.processExperiments(experiments, phoenixClient, datasetInfosById);

      const allEvaluatorNames = new Set<string>();
      datasetScores.forEach((dataset) => {
        dataset.evaluatorScores.forEach((_, evaluatorName) => {
          allEvaluatorNames.add(evaluatorName);
        });
      });
      const evaluatorNames = Array.from(allEvaluatorNames).sort();

      const documents: ModelScoreDocument[] = [];
      const timestamp = new Date().toISOString();

      for (const dataset of datasetScores) {
        for (const evaluatorName of evaluatorNames) {
          const scores = dataset.evaluatorScores.get(evaluatorName) || [];
          const stats = this.calculateStats(scores, dataset.numExamples);

          if (stats.count === 0) {
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
            },
            experiments: dataset.experiments,
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
        const bulkBody: any[] = [];

        for (const doc of documents) {
          bulkBody.push({
            index: {
              _index: ELASTICSEARCH_INDEX,
              _id: `${doc.environment.hostname}-${doc.model.id}-${doc.dataset.id}-${doc.evaluator.name}-${timestamp}`,
            },
          });
          bulkBody.push(doc);
        }

        await this.esClient.bulk({
          body: bulkBody,
        });

        this.log.success(
          `Successfully exported ${documents.length} evaluation score records to Elasticsearch index: ${ELASTICSEARCH_INDEX}`
        );

        // Log summary information for easy querying
        this.log.info(`Export details:`);
        this.log.info(
          `  - Query filter: environment.hostname:"${hostname()}" AND model.id:"${
            model.id
          }" AND run_id:"${runId}"`
        );
        this.log.info(`  - Timestamp: ${timestamp}`);
        this.log.info(`  - Datasets: ${datasetScores.map((d) => d.name).join(', ')}`);
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
          must: [{ term: { 'run_id.keyword': runId } }],
        },
      };

      const response = await this.esClient.search({
        index: ELASTICSEARCH_INDEX,
        query,
        sort: [
          { 'dataset.name.keyword': { order: 'asc' as const } },
          { 'evaluator.name.keyword': { order: 'asc' as const } },
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
