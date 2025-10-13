/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Streams, Feature } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import pLimit from 'p-limit';
import { IdentifySystemsPrompt } from './prompt';
import { clusterLogs } from '../cluster_logs/cluster_logs';
import conditionSchemaText from '../shared/condition_schema.text';
import { generateStreamDescription } from '../description/generate_description';

const CONCURRENT_DESCRIPTION_REQUESTS = 5;

/**
 * Identifies features in a stream, by:
 * - describing the dataset (via sampled documents)
 * - clustering docs together on similarity
 * - asking the LLM to identify features by creating
 * queries and validating the resulting clusters
 */
export async function identifyFeatures({
  stream,
  features,
  start,
  end,
  esClient,
  kql,
  inferenceClient,
  logger,
  dropUnmapped = false,
}: {
  stream: Streams.all.Definition;
  features?: Feature[];
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  kql?: string;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  dropUnmapped?: boolean;
}): Promise<{ features: Feature[] }> {
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
    maxSteps: 3,
    input: {
      stream: {
        name: stream.name,
        description: stream.description || 'This stream has no description.',
      },
      dataset_analysis: JSON.stringify(
        sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true, dropUnmapped })
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

  const limiter = pLimit(CONCURRENT_DESCRIPTION_REQUESTS);

  return {
    features: await Promise.all(
      response.toolCalls.flatMap((toolCall) =>
        toolCall.function.arguments.systems.map(async (args) => {
          const feature = {
            ...args,
            filter: args.filter as Condition,
            description: '',
          };

          const description = await limiter(async () => {
            return await generateStreamDescription({
              stream,
              start,
              end,
              esClient,
              inferenceClient,
              feature,
            });
          });

          return {
            ...feature,
            description,
          };
        })
      )
    ),
  };
}
