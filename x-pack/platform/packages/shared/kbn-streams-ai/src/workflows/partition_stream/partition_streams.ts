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
import { conditionSchema, type Condition } from '@kbn/streamlang';
import { DeepStrict } from '@kbn/zod-helpers';
import { conditionSchema as conditionJsonSchema } from '../../json_schema/condition_schema';
import { SuggestStreamPartitionsPrompt } from './prompt';
import { clusterLogs } from '../../cluster_logs/cluster_logs';

const strictConditionSchema = DeepStrict(conditionSchema);

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
  logger.info(
    JSON.stringify({
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      stream: definition.name,
    })
  );

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

  const response = await executeAsReasoningAgent({
    inferenceClient,
    prompt: SuggestStreamPartitionsPrompt,
    input: {
      stream: definition,
      initial_clustering: JSON.stringify(initialClusters),
      condition_schema: JSON.stringify(conditionJsonSchema),
    },
    maxSteps,
    toolCallbacks: {
      finalize_log_partitions: async () => {
        return {
          response: {
            acknowledged: true,
          },
        };
      },
      simulate_log_partitions: async (toolCall) => {
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
      function: 'finalize_log_partitions',
    },
    abortSignal: signal,
  });

  const proposedPartitions =
    response.toolCalls
      ?.flatMap((toolCall) => toolCall.function.arguments.partitions ?? [])
      .map(({ name, condition }) => {
        // Sanitize name to be alphanumeric with dashes only, lowercase
        const sanitizedName = name
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
        return {
          name: `${definition.name}.${sanitizedName}`,
          condition: condition as Condition,
        };
      }) ?? [];

  return proposedPartitions.filter(
    ({ condition }) =>
      strictConditionSchema.safeParse(condition).success && !isEqual(condition, { always: {} })
  );
}
