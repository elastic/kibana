/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { type Streams, type System } from '@kbn/streams-schema';
import { isCondition, type Condition } from '@kbn/streamlang';
import { withSpan } from '@kbn/apm-utils';
import { createIdentifySystemsPrompt } from './prompt';
import { clusterLogs } from '../cluster_logs/cluster_logs';
import conditionSchemaText from '../shared/condition_schema.text';
import { sumTokens } from '../helpers/sum_tokens';

export interface IdentifySystemsOptions {
  stream: Streams.all.Definition;
  systems?: System[];
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  signal: AbortSignal;
  descriptionPrompt: string;
  systemsPrompt: string;
  dropUnmapped?: boolean;
  maxSteps?: number;
}

export interface IdentifySystemsResult {
  systems: System[];
  tokensUsed: ChatCompletionTokenCount;
}

/**
 * Identifies systems in a stream, by:
 * - describing the dataset (via sampled documents)
 * - clustering docs together on similarity
 * - asking the LLM to identify systems by creating
 * queries and validating the resulting clusters
 */
export async function identifySystems({
  stream,
  systems,
  start,
  end,
  esClient,
  inferenceClient,
  logger,
  signal,
  maxSteps: initialMaxSteps,
  dropUnmapped,
  systemsPrompt,
}: IdentifySystemsOptions): Promise<IdentifySystemsResult> {
  logger.debug(`Identifying systems for stream ${stream.name}`);

  const analysis = await withSpan('describe_dataset_for_system_identification', () =>
    describeDataset({
      start,
      end,
      esClient,
      index: stream.name,
    })
  );

  logger.trace('Performing initial clustering of logs for system identification');
  const initialClustering = await withSpan('initial_log_clustering', () =>
    clusterLogs({
      start,
      end,
      esClient,
      index: stream.name,
      partitions:
        systems?.map((system) => {
          return {
            name: system.name,
            condition: system.filter,
          };
        }) ?? [],
      logger,
      dropUnmapped,
    })
  );

  logger.trace('Invoking reasoning agent to identify systems');
  const response = await withSpan('invoke_reasoning_agent', () =>
    executeAsReasoningAgent({
      maxSteps: initialMaxSteps,
      input: {
        stream: {
          name: stream.name,
          description: stream.description || 'This stream has no description.',
        },
        dataset_analysis: JSON.stringify(
          formatDocumentAnalysis(analysis, { dropEmpty: true, dropUnmapped })
        ),
        initial_clustering: JSON.stringify(initialClustering),
        condition_schema: conditionSchemaText,
      },
      prompt: createIdentifySystemsPrompt({ systemPrompt: systemsPrompt }),
      inferenceClient,
      finalToolChoice: {
        function: 'finalize_systems',
      },
      toolCallbacks: {
        validate_systems: async (toolCall) => {
          const clustering = await clusterLogs({
            start,
            end,
            esClient,
            index: stream.name,
            logger,
            partitions: toolCall.function.arguments.systems.map((system) => {
              return {
                name: system.name,
                condition: system.filter as Condition,
              };
            }),
            dropUnmapped,
          });

          return {
            response: {
              systems: clustering.map((cluster) => {
                return {
                  name: cluster.name,
                  clustering: cluster.clustering,
                };
              }),
            },
          };
        },
        finalize_systems: async (toolCall) => {
          return {
            response: {},
          };
        },
      },
      abortSignal: signal,
    })
  );

  const identifiedSystems = response.toolCalls.flatMap((toolCall) =>
    toolCall.function.arguments.systems
      .filter((args) => isCondition(args.filter))
      .map((args) => {
        const system = {
          ...args,
          filter: args.filter as Condition,
          type: 'system' as const,
        };
        return { ...system, description: '' };
      })
  );

  logger.debug(`Identified ${identifiedSystems.length} system features for stream ${stream.name}`);

  return {
    systems: identifiedSystems,
    tokensUsed: sumTokens(
      {
        prompt: 0,
        completion: 0,
        total: 0,
        cached: 0,
      },
      response.tokens
    ),
  };
}
