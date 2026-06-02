/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { EVALUATIONS_INDEX_PATTERN } from '@kbn/evals-common';

interface MinimalLogger {
  warn: (message: string) => void;
}

const EVALUATIONS_TEMPLATE_NAME = 'kibana-evaluations-template';

/**
 * Ensures the `kibana-evaluations` data stream index template exists with the
 * proper keyword mappings. Without this, ES auto-creates the data stream with
 * dynamic text mappings on first write, which breaks the keyword aggregations
 * the Runs page relies on (run.id, suite.id, evaluator.name, etc.).
 *
 * Idempotent: if the template already exists this returns without modifying it.
 * Both the AESOP `eval_results_persister` and the Workflows-based experiments
 * path call this before writing into the data stream so the bootstrap path is
 * the same regardless of which feature triggers the very first write.
 */
export const ensureEvaluationsIndexTemplate = async (
  esClient: ElasticsearchClient
): Promise<void> => {
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

/**
 * Best-effort wrapper that logs a warning instead of throwing — useful for
 * call sites where bootstrap failure shouldn't kill the surrounding operation
 * (e.g. AESOP eval persistence keeps going so the run still produces logs).
 *
 * Accepts a minimal logger surface so this is callable from both Kibana
 * `Logger` and lighter step/runner loggers without an adapter.
 */
export const ensureEvaluationsIndexTemplateSafe = async (
  esClient: ElasticsearchClient,
  logger: MinimalLogger,
  context: string
): Promise<void> => {
  try {
    await ensureEvaluationsIndexTemplate(esClient);
  } catch (err) {
    logger.warn(
      `[${context}] Failed to ensure evaluations index template: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};
