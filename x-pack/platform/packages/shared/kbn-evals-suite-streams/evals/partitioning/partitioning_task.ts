/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/scout';
import type { Condition } from '@kbn/streamlang';
import { findSSEEventData } from '../shared_helpers';
import type {
  PartitioningEvaluationExample,
  PartitioningGroundTruth,
} from './partitioning_datasets';
import { calculatePartitioningMetrics, type PartitioningMetrics } from './partitioning_metrics';

export interface PartitionSuggestionResult {
  input: PartitioningEvaluationExample['input'];
  output: {
    suggestedPartitions: Array<{ name: string; condition: Condition }>;
    reason?: 'no_clusters' | 'no_samples' | 'all_data_partitioned';
    metrics: PartitioningMetrics;
  };
  expected: PartitioningGroundTruth;
  metadata: PartitioningEvaluationExample['metadata'];
}

const suggestPartitions = async (
  kbnClient: KbnClient,
  streamName: string,
  connectorId: string,
  start: number,
  end: number,
  existingPartitions?: Array<{ name: string; condition: Condition }>,
  userPrompt?: string,
  refinementHistory?: string[]
): Promise<{
  partitions: Array<{ name: string; condition: Condition }>;
  reason?: 'no_clusters' | 'no_samples' | 'all_data_partitioned';
  rawResponse: string;
}> => {
  const body: Record<string, unknown> = {
    connector_id: connectorId,
    start,
    end,
  };

  if (existingPartitions && existingPartitions.length > 0) {
    body.existing_partitions = existingPartitions;
  }
  if (userPrompt) {
    body.user_prompt = userPrompt;
  }
  if (refinementHistory && refinementHistory.length > 0) {
    body.refinement_history = refinementHistory;
  }

  const response = await kbnClient.request({
    method: 'POST',
    path: `/internal/streams/${streamName}/_suggest_partitions`,
    body,
  });

  const rawResponse = response.data as string;
  const data = findSSEEventData<{
    partitions: Array<{ name: string; condition: Condition }>;
    reason?: 'no_clusters' | 'no_samples';
  }>(rawResponse, 'suggested_partitions');

  return {
    partitions: data?.partitions ?? [],
    reason: data?.reason,
    rawResponse,
  };
};

export const runPartitionSuggestion = async (
  example: PartitioningEvaluationExample,
  kbnClient: KbnClient,
  esClient: Client,
  connector: { id: string }
): Promise<PartitionSuggestionResult> => {
  const { input, output: expected, metadata } = example;

  try {
    const now = Date.now();
    const start = input.start ?? now - 5 * 60 * 1000;
    const end = input.end ?? now;

    const { partitions: suggestedPartitions, reason } = await suggestPartitions(
      kbnClient,
      input.stream_name,
      connector.id,
      start,
      end,
      input.existing_partitions,
      input.user_prompt,
      input.refinement_history
    );

    const metrics = await calculatePartitioningMetrics(
      esClient,
      input.stream_name,
      suggestedPartitions
    );

    return {
      input,
      output: {
        suggestedPartitions,
        reason,
        metrics,
      },
      expected,
      metadata,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in runPartitionSuggestion:', error);
    throw error;
  }
};
