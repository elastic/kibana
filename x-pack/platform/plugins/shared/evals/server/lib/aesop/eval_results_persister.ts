/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EVALUATIONS_WRITE_INDEX } from '@kbn/evals-common';

const EVALUATIONS_TEMPLATE_NAME = 'kibana-evaluations-template';
const EVALUATIONS_INDEX_PATTERN = 'kibana-evaluations*';

/**
 * Ensures the kibana-evaluations data stream index template exists with proper
 * keyword mappings. Without this, ES auto-creates the index with dynamic text
 * mappings, which breaks aggregation queries on the Runs page.
 *
 * This mirrors the template defined in EvaluationScoreRepository.ensureIndexTemplate()
 * from @kbn/evals but works with the Kibana server ES client.
 */
const ensureEvaluationsTemplate = async (esClient: ElasticsearchClient): Promise<void> => {
  const exists = await esClient.indices
    .existsIndexTemplate({ name: EVALUATIONS_TEMPLATE_NAME })
    .catch(() => false);

  if (exists) return;

  await esClient.indices.putIndexTemplate({
    name: EVALUATIONS_TEMPLATE_NAME,
    index_patterns: [EVALUATIONS_INDEX_PATTERN],
    data_stream: {},
    template: {
      settings: { refresh_interval: '5s' },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          run_id: { type: 'keyword' },
          experiment_id: { type: 'keyword' },
          suite: { type: 'object', properties: { id: { type: 'keyword' } } },
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
              input: { type: 'object', enabled: false },
              dataset: {
                type: 'object',
                properties: { id: { type: 'keyword' }, name: { type: 'keyword' } },
              },
            },
          },
          task: {
            type: 'object',
            properties: {
              trace_id: { type: 'keyword' },
              repetition_index: { type: 'integer' },
              output: { type: 'object', enabled: false },
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
            properties: { hostname: { type: 'keyword' } },
          },
        },
      },
    },
  });
};

export interface PersistEvalRunOptions {
  runId: string;
  datasetId: string;
  datasetName: string;
  skillId: string;
  skillName: string;
  connectorId: string;
  items: Array<{
    exampleId: string;
    index: number;
    input: Record<string, unknown>;
    output: unknown;
    expected?: unknown;
  }>;
  evaluatorResults: Array<{
    itemIndex: number;
    evaluator: string;
    score: number | null;
    label?: string;
    explanation?: string;
  }>;
  esClient: ElasticsearchClient;
  logger: Logger;
}

export const persistEvalRun = async (options: PersistEvalRunOptions): Promise<void> => {
  const { runId, items, evaluatorResults, esClient, logger } = options;
  const now = new Date().toISOString();

  // Ensure the data stream template exists with keyword mappings before writing
  try {
    await ensureEvaluationsTemplate(esClient);
  } catch (err) {
    logger.warn(
      `[AESOP] Failed to ensure evaluations template: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const operations = evaluatorResults.flatMap((result) => {
    const item = items[result.itemIndex];
    if (!item) return [];

    // Build a deterministic document ID to prevent duplicates on retry
    const docId = [
      runId,
      `skill-eval:${options.skillId}`,
      options.connectorId,
      options.datasetId,
      item.exampleId,
      result.evaluator,
      0, // repetition_index
    ].join('-');

    // Strip large fields (skill markdown) from the persisted input to avoid
    // bloating the data stream — the markdown is identical across all examples.
    const { markdown: _markdown, ...persistedInput } = item.input;

    return [
      { create: { _index: EVALUATIONS_WRITE_INDEX, _id: docId } },
      {
        '@timestamp': now,
        run_id: runId,
        experiment_id: runId,
        example: {
          id: item.exampleId,
          index: result.itemIndex,
          input: persistedInput,
          dataset: { id: options.datasetId, name: options.datasetName },
        },
        task: {
          trace_id: null,
          repetition_index: 0,
          output: item.output ?? {},
          model: { id: options.connectorId },
        },
        evaluator: {
          name: result.evaluator,
          score: result.score,
          label: result.label,
          explanation: result.explanation,
          metadata: null,
          trace_id: null,
          model: { id: options.connectorId },
        },
        run_metadata: {
          git_branch: null,
          git_commit_sha: null,
          total_repetitions: 1,
        },
        suite: { id: `skill-eval:${options.skillId}` },
        environment: { hostname: 'kibana-server' },
      },
    ];
  });

  if (operations.length === 0) return;

  const resp = await esClient.bulk({ operations, refresh: 'wait_for' });
  if (resp.errors) {
    // 409 conflicts are expected on retries — count them separately
    const allItems = resp.items ?? [];
    const conflicts = allItems.filter((i) => i.create?.status === 409);
    const realErrors = allItems.filter((i) => i.create?.error && i.create?.status !== 409);
    if (realErrors.length > 0) {
      logger.warn(`[AESOP] Persisted eval run ${runId} with ${realErrors.length} errors`);
    } else {
      logger.info(
        `[AESOP] Persisted eval run ${runId}: ${operations.length / 2} documents (${
          conflicts.length
        } already existed)`
      );
    }
  } else {
    logger.info(`[AESOP] Persisted eval run ${runId}: ${operations.length / 2} documents`);
  }
};
