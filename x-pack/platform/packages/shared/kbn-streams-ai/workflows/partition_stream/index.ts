/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Condition, Streams } from '@kbn/streams-schema';
import { BoundInferenceClient, MessageRole, callPromptUntil } from '@kbn/inference-common';
import { ValuesType } from 'utility-types';
import { isEqual } from 'lodash';
import { SuggestStreamPartitionsPrompt } from './prompt';
import { clusterLogs } from '../../tools/cluster_logs/cluster_logs';

export async function partitionStream({
  definition,
  inferenceClient,
  esClient,
  logger,
  start,
  end,
  signal,
  maxSteps = 8,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  signal: AbortSignal;
  maxSteps?: number;
}): Promise<Array<{ name: string; condition: Condition }>> {
  const messages = await callPromptUntil({
    inferenceClient,
    prompt: SuggestStreamPartitionsPrompt,
    input: {
      stream: definition,
    },
    maxSteps,
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

  const finalPartitions = messages.findLast(
    (message): message is Extract<ValuesType<typeof messages>, { role: MessageRole.Assistant }> => {
      return (
        message.role === MessageRole.Assistant &&
        !!message.toolCalls.find((toolCall) => toolCall.function.name === 'cluster_logs')
      );
    }
  );

  const proposedPartitions =
    finalPartitions?.toolCalls
      .flatMap((toolCall) => toolCall.function.arguments.partitions ?? [])
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
