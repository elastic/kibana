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
import type { Streams, SystemFeature, InfrastructureFeature } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import { IdentifySystemsPrompt, IdentifyInfrastructurePrompt } from './prompt';
import { clusterLogs } from '../cluster_logs/cluster_logs';
import conditionSchemaText from '../shared/condition_schema.text';

/**
 * Identifies features in a stream, by:
 * - describing the dataset (via sampled documents)
 * - clustering docs together on similarity
 * - asking the LLM to identify features by creating
 * queries and validating the resulting clusters
 */
export async function identifySystemFeatures({
  stream,
  features,
  start,
  end,
  esClient,
  inferenceClient,
  logger,
  signal,
  dropUnmapped = false,
  maxSteps: initialMaxSteps,
}: {
  stream: Streams.all.Definition;
  features?: SystemFeature[];
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  signal: AbortSignal;
  dropUnmapped?: boolean;
  maxSteps?: number;
}): Promise<{ features: Omit<SystemFeature, 'description'>[] }> {
  const [analysis, initialClustering] = await Promise.all([
    describeDataset({
      start,
      end,
      esClient,
      index: stream.name,
    }),
    clusterLogs({
      start,
      end,
      esClient,
      index: stream.name,
      partitions:
        features?.map((feature) => {
          return {
            name: feature.name,
            condition: feature.filter,
          };
        }) ?? [],
      logger,
      dropUnmapped,
    }),
  ]);

  const response = await executeAsReasoningAgent({
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
    prompt: IdentifySystemsPrompt,
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
  });

  return {
    features: response.toolCalls.flatMap((toolCall) =>
      toolCall.function.arguments.systems.map((args) => {
        const feature = {
          ...args,
          filter: args.filter as Condition,
          type: 'system' as const,
        };
        return feature;
      })
    ),
  };
}

/**
 * Identifies infrastructure features in a stream, by:
 * - describing the dataset (via sampled documents)
 * - asking the LLM to identify infrastructure components
 * without the need for filtering or clustering
 */
export async function identifyInfrastructureFeatures({
  stream,
  start,
  end,
  esClient,
  inferenceClient,
  signal,
  dropUnmapped = false,
  maxSteps: initialMaxSteps = 10,
}: {
  stream: Streams.all.Definition;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  dropUnmapped?: boolean;
  maxSteps?: number;
}): Promise<{ features: Omit<InfrastructureFeature, 'description'>[] }> {
  const analysis = await describeDataset({
    start,
    end,
    esClient,
    index: stream.name,
  });

  const response = await executeAsReasoningAgent({
    maxSteps: initialMaxSteps,
    input: {
      stream: {
        name: stream.name,
        description: stream.description || 'This stream has no description.',
      },
      dataset_analysis: JSON.stringify(
        formatDocumentAnalysis(analysis, { dropEmpty: true, dropUnmapped })
      ),
    },
    prompt: IdentifyInfrastructurePrompt,
    inferenceClient,
    finalToolChoice: {
      function: 'finalize_infrastructure',
    },
    toolCallbacks: {
      finalize_infrastructure: async (toolCall) => {
        return {
          response: {},
        };
      },
    },
    abortSignal: signal,
  });

  return {
    features: response.toolCalls.flatMap((toolCall) =>
      toolCall.function.arguments.infrastructure.map((args) => {
        const feature = {
          ...args,
          type: 'infrastructure' as const,
        };
        return feature;
      })
    ),
  };
}
