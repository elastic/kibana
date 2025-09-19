/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Streams } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import type { Condition } from '@kbn/streamlang';
import { clusterLogs } from '../../tools/cluster_logs/cluster_logs';
import { SuggestStreamPartitionsPrompt } from './prompt';
import { schema } from './schema';

export async function partitionStream({
  definition,
  inferenceClient,
  esClient,
  logger,
  start,
  end,
  maxSteps,
  signal,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  maxSteps?: number | undefined;
  signal: AbortSignal;
}): Promise<Array<{ name: string; condition: Condition }>> {
  const initialClusters = await clusterLogs({
    esClient,
    start,
    end,
    index: definition.name,
    logger,
    partitions: [],
    size: 1000,
  });

  // No need to involve reasoning if there are no initial clusters
  if (initialClusters.length === 0) {
    return [];
  }

  // No need to involve reasoning if there are no sample documents
  if (initialClusters.every((cluster) => cluster.clustering.sampled === 0)) {
    return [];
  }

  const response = await executeAsReasoningAgent({
    inferenceClient,
    prompt: SuggestStreamPartitionsPrompt,
    input: {
      stream: definition,
      initial_clustering: JSON.stringify(initialClusters),
      condition_schema: JSON.stringify(schema),
    },
    maxSteps,
    toolCallbacks: {
      partition_logs: async (toolCall) => {
        const partitions = (toolCall.function.arguments.partitions ?? []) as Array<{
          name: string;
          condition: Condition;
        }>;

        const partitionsResponse = await clusterLogs({
          esClient,
          start,
          end,
          index: toolCall.function.arguments.index,
          partitions,
          logger,
        });

        return { response: { partitions: partitionsResponse } };
      },
    },
    finalToolChoice: {
      type: 'function',
      function: 'partition_logs',
    },
    abortSignal: signal,
  });

  const proposedPartitions =
    response?.toolCalls
      ?.flatMap((toolCall) => toolCall.function.arguments.partitions ?? [])
      .map(({ name, condition }) => {
        return {
          name,
          condition: condition as Condition,
        };
      }) ?? [];

  return proposedPartitions.filter(({ condition }) => {
    return !isEqual(condition, { always: {} });
  });
}
