/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Streams, System } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import type { ReasoningPower } from '@kbn/inference-prompt-utils/src/flows/reasoning/types';
import { IdentifySystemsPrompt } from './prompt';
import { clusterLogs } from '../cluster_logs/cluster_logs';
import conditionSchemaText from '../shared/condition_schema.text';

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
  kql,
  inferenceClient,
  logger,
  dropUnmapped = false,
  power = 'medium',
  maxSteps: initialMaxSteps,
}: {
  stream: Streams.all.Definition;
  systems?: System[];
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  kql?: string;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  dropUnmapped?: boolean;
  power?: ReasoningPower;
  maxSteps?: number;
}): Promise<{ systems: Array<{ name: string; filter: Condition }> }> {
  const [analysis, initialClustering] = await Promise.all([
    describeDataset({
      start,
      end,
      esClient,
      index: stream.name,
      kql: kql || undefined,
    }),
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
    }),
  ]);

  const maxSteps = initialMaxSteps ?? power === 'low' ? 3 : power === 'medium' ? 5 : 12;

  const response = await executeAsReasoningAgent({
    maxSteps,
    input: {
      stream: {
        name: stream.name,
      },
      dataset_analysis: JSON.stringify(
        formatDocumentAnalysis(analysis, { dropEmpty: true, dropUnmapped })
      ),
      initial_clustering: JSON.stringify(initialClustering),
      condition_schema: conditionSchemaText,
    },
    prompt: IdentifySystemsPrompt,
    inferenceClient,
    finalToolChoice: {
      function: 'finalize_systems',
    },
    power,
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
  });

  return {
    systems: response.toolCalls.flatMap((toolCall) =>
      toolCall.function.arguments.systems.map((system) => ({
        name: system.name,
        filter: system.filter as Condition,
      }))
    ),
  };
}
