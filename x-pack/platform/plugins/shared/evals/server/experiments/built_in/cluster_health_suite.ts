/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MessageRole } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import type { EvaluationDataset, Evaluator } from '@kbn/evals-runner';
import type { ExperimentSuiteDefinition, ExperimentSuiteRunContext } from '../types';

const SUITE_ID = 'builtin.clusterHealth';

const SUITE_NAME = i18n.translate('xpack.evals.onlineSuites.clusterHealth.name', {
  defaultMessage: 'Cluster health (built-in)',
});

const SUITE_DESCRIPTION = i18n.translate('xpack.evals.onlineSuites.clusterHealth.description', {
  defaultMessage: 'Asks the model to report the current Elasticsearch cluster health status.',
});

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const firstToken = value.trim().toLowerCase().split(/\s+/)[0];
  if (firstToken === 'green' || firstToken === 'yellow' || firstToken === 'red') {
    return firstToken;
  }
  return null;
}

export const clusterHealthExperimentSuite: ExperimentSuiteDefinition = {
  id: SUITE_ID,
  name: SUITE_NAME,
  description: SUITE_DESCRIPTION,
  inputSchema: z.unknown(),
  // Cluster health is a deterministic check, so a single repetition is plenty.
  // Surface that opinion to the UI so the "Run now" form pre-fills 1 instead
  // of the generic platform default of 3.
  defaultRepetitions: 1,
  run: async (ctx: ExperimentSuiteRunContext) => {
    const health = await ctx.esClient.cluster.health();
    const expectedStatus = String(health.status);

    const dataset: EvaluationDataset = {
      name: 'elasticsearch.cluster_health',
      description: 'Elasticsearch cluster health status captured at execution time.',
      examples: [
        {
          id: String(health.cluster_name ?? 'cluster'),
          input: {
            cluster_name: health.cluster_name,
            status: expectedStatus,
          },
          output: expectedStatus,
          metadata: {
            timed_out: health.timed_out,
            number_of_nodes: health.number_of_nodes,
            number_of_data_nodes: health.number_of_data_nodes,
            active_primary_shards: health.active_primary_shards,
            active_shards: health.active_shards,
            relocating_shards: health.relocating_shards,
            initializing_shards: health.initializing_shards,
            unassigned_shards: health.unassigned_shards,
            delayed_unassigned_shards: health.delayed_unassigned_shards,
            number_of_pending_tasks: health.number_of_pending_tasks,
            number_of_in_flight_fetch: health.number_of_in_flight_fetch,
            task_max_waiting_in_queue_millis: health.task_max_waiting_in_queue_millis,
            active_shards_percent_as_number: health.active_shards_percent_as_number,
          },
        },
      ],
    };

    const task = async () => {
      const response = await ctx.inferenceClient.chatComplete({
        system: 'You are a precise assistant. Answer with a single word.',
        messages: [
          {
            role: MessageRole.User,
            content: `What is the current Elasticsearch cluster health status? Answer with exactly one of: green, yellow, red.`,
          },
        ],
        temperature: 0,
        abortSignal: ctx.abortSignal,
      });

      return response.content;
    };

    const evaluator: Evaluator = {
      name: 'cluster_health_status_match',
      kind: 'CODE',
      evaluate: async ({ output, expected }) => {
        const expectedNormalized = normalizeStatus(expected) ?? String(expected).toLowerCase();
        const outputNormalized = normalizeStatus(output);
        const isCorrect = outputNormalized === expectedNormalized;

        return {
          score: isCorrect ? 1 : 0,
          label: isCorrect ? 'correct' : 'incorrect',
          explanation: isCorrect
            ? `Output matched expected status "${expectedNormalized}".`
            : `Expected "${expectedNormalized}", got "${String(output)}".`,
          metadata: {
            expected_status: expectedNormalized,
            parsed_output_status: outputNormalized,
          },
        };
      },
    };

    ctx.logger.info(`Running built-in cluster health suite for runId="${ctx.runId}"`);
    await ctx.executorClient.runExperiment({ dataset, task }, [evaluator]);
  },
};
