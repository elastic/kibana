/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EVALUATIONS_WRITE_INDEX } from '@kbn/evals-common';
import { ensureEvaluationsIndexTemplateSafe } from '../evaluations_index_template';

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
  await ensureEvaluationsIndexTemplateSafe(esClient, logger, 'AESOP');

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
