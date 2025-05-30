/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Condition, Streams } from '@kbn/streams-schema';
import {
  AssistantMessageOf,
  BoundInferenceClient,
  ToolOptionsOfPrompt,
  callPromptUntil,
} from '@kbn/inference-common';
import { isEqual, last } from 'lodash';
import { SuggestStreamPartitionsPrompt } from './prompt';
import { clusterLogs } from '../../tools/cluster_logs/cluster_logs';
import { schema } from './schema';

export async function partitionStream({
  definition,
  inferenceClient,
  esClient,
  logger,
  start,
  end,
  signal,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
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

  const messages = await callPromptUntil({
    inferenceClient,
    prompt: SuggestStreamPartitionsPrompt,
    input: {
      stream: definition,
      initial_clustering: JSON.stringify(initialClusters),
      condition_schema: JSON.stringify(schema),
    },
    strategy: 'next',
    toolCallbacks: {
      cluster_logs: async (toolCall) => {
        const partitions = (toolCall.function.arguments.partitions ?? []) as Array<{
          name: string;
          condition: Condition;
        }>;

        const response = await clusterLogs({
          esClient,
          start,
          end,
          index: toolCall.function.arguments.index,
          partitions,
          logger,
        });

        return { partitions: response };
      },
    },
    abortSignal: signal,
  });

  const conclusion = last(messages) as AssistantMessageOf<
    ToolOptionsOfPrompt<typeof SuggestStreamPartitionsPrompt>
  >;

  const proposedPartitions =
    conclusion?.toolCalls
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
