/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Feature, Streams } from '@kbn/streams-schema';
import {
  conditionSchema,
  extractModifiedFields,
  isActionBlock,
  isConditionBlock,
  type Condition,
  type StreamlangStep,
} from '@kbn/streamlang';
import { DeepStrict } from '@kbn/zod-helpers/v4';
import { clusterLogs } from '../../src/cluster_logs/cluster_logs';
import { SuggestStreamPartitionsPrompt } from './prompt';
import { schema } from './schema';
import {
  getFeatureQueryFromToolArgs,
  resolveFeatureTypeFilters,
  toFeatureForLlmContext,
} from './features_tool';

const strictConditionSchema = DeepStrict(conditionSchema);
export type PartitionSuggestionsReason = 'no_clusters' | 'no_samples' | 'all_data_partitioned';

// Must be a `type` alias, not an `interface`. Interfaces lack implicit index
// signatures, so `Observable<ServerSentEventBase<..., PartitionStreamResponse>>`
// would not be assignable to `Observable<ServerSentEvent>` (which requires
// `Record<string, unknown>`), causing the route handler return type to collapse
// to `never`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PartitionStreamResponse = {
  partitions: Array<{ name: string; condition: Condition }>;
  reason?: PartitionSuggestionsReason;
};

export async function partitionStream({
  definition,
  inferenceClient,
  esClient,
  logger,
  start,
  end,
  maxSteps,
  signal,
  getFeatures,
  userPrompt,
  previousSuggestions = [],
}: {
  definition: Streams.WiredStream.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  maxSteps?: number | undefined;
  signal: AbortSignal;
  getFeatures(params?: {
    type?: string[];
    minConfidence?: number;
    limit?: number;
  }): Promise<Feature[]>;
  userPrompt?: string;
  /**
   * Partitions that were suggested in a prior call but have not yet been
   * applied to the stream. The clustering step seeds these into the LLM's
   * context so it can refine or replace them; passing them does NOT exclude
   * matching docs from sampling. The stream's *actual* enabled child
   * routes are derived from `definition.ingest.wired.routing` and applied
   * as exclusions automatically.
   *
   * Previously named `existingPartitions`, which collided with the agent
   * tool's `existing_partitions` result field (real disk-stored children).
   */
  previousSuggestions?: Array<{ name: string; condition: Condition }>;
}): Promise<PartitionStreamResponse> {
  const enabledChildConditions = definition.ingest.wired.routing
    .filter((route) => route.status !== 'disabled')
    .map((route) => route.where);

  const initialClusters = await clusterLogs({
    esClient,
    start,
    end,
    index: definition.name,
    logger,
    partitions: previousSuggestions,
    excludeConditions: enabledChildConditions,
    size: 1000,
  });

  // No need to involve reasoning if there are no initial clusters
  if (initialClusters.length === 0) {
    return { partitions: [], reason: 'no_clusters' };
  }

  // No need to involve reasoning if there are no sample documents
  if (initialClusters.every((cluster) => cluster.clustering.sampled === 0)) {
    // If there are enabled child conditions, we need to determine whether:
    // - All data is already partitioned (all_data_partitioned), or
    // - There are simply no samples in the time range (no_samples)
    // We do this by checking if at least one doc exists without exclusions
    if (enabledChildConditions.length > 0) {
      const countResponse = await esClient.count({
        index: definition.name,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': { gte: start, lte: end, format: 'epoch_millis' },
                },
              },
            ],
          },
        },
      });

      const hasAnyDocsWithoutExclusion = countResponse.count > 0;

      return {
        partitions: [],
        reason: hasAnyDocsWithoutExclusion ? 'all_data_partitioned' : 'no_samples',
      };
    }

    return {
      partitions: [],
      reason: 'no_samples',
    };
  }

  const processingSummary = summarizeProcessingPipeline(definition);

  const response = await executeAsReasoningAgent({
    inferenceClient,
    prompt: SuggestStreamPartitionsPrompt,
    input: {
      stream: definition,
      initial_clustering: JSON.stringify(initialClusters),
      condition_schema: JSON.stringify(schema),
      ...(userPrompt ? { user_prompt: userPrompt } : {}),
      ...(previousSuggestions.length > 0
        ? { previous_suggestions: JSON.stringify(previousSuggestions) }
        : {}),
      ...(processingSummary ? { processing_summary: processingSummary } : {}),
    },
    maxSteps,
    toolCallbacks: {
      get_stream_features: async (toolCall) => {
        try {
          const { featureTypes, minConfidence, limit } = getFeatureQueryFromToolArgs(
            toolCall.function.arguments
          );
          const typeFilters = resolveFeatureTypeFilters(featureTypes);
          const features = await getFeatures({
            type: typeFilters,
            minConfidence,
            limit,
          });
          const llmFeatures = features.map(toFeatureForLlmContext);

          return {
            response: {
              features: llmFeatures,
              count: llmFeatures.length,
            },
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(`Failed to fetch stream features: ${errorMessage}`);
          return {
            response: {
              features: [],
              count: 0,
              error: errorMessage,
            },
          };
        }
      },
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
          excludeConditions: enabledChildConditions,
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

  const seenNames = new Set<string>();
  const proposedPartitions = (response?.toolCalls
    ?.flatMap((toolCall) => toolCall.function.arguments.partitions ?? [])
    .map(({ name, condition }) => {
      // Strip the parent stream prefix if the LLM echoed it back (e.g. "logs.otel.foo" → "foo")
      const baseName = name.startsWith(`${definition.name}.`)
        ? name.slice(definition.name.length + 1)
        : name;

      // Sanitize name to be alphanumeric with dashes only, lowercase
      const sanitizedName = baseName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!sanitizedName) {
        return null;
      }

      const fullName = `${definition.name}.${sanitizedName}`;

      if (seenNames.has(fullName)) {
        return null;
      }
      seenNames.add(fullName);

      return {
        name: fullName,
        condition: condition as Condition,
      };
    })
    .filter(Boolean) ?? []) as Array<{ name: string; condition: Condition }>;

  const partitions = proposedPartitions.filter(
    ({ condition }) => strictConditionSchema.safeParse(condition).success
  );
  return {
    partitions,
    reason: partitions.length === 0 ? 'no_clusters' : undefined,
  };
}

/**
 * Builds a short, LLM-friendly summary of the fields produced by the stream's
 * existing processing pipeline. The model uses cluster samples as its primary
 * source of truth for which fields exist, but those samples reflect documents
 * the pipeline has already processed — newly-added pipeline steps may produce
 * fields that are not yet present in older indexed documents.
 *
 * Surfacing the pipeline's output fields in the prompt closes that gap so the
 * model can confidently use them in partition conditions even when they are
 * sparsely represented (or absent) in the cluster samples.
 *
 * Returns `null` when the stream has no processing pipeline (e.g. query
 * streams or freshly-forked wired streams) so the caller can omit the
 * section entirely.
 */
const summarizeProcessingPipeline = (definition: Streams.WiredStream.Definition): string | null => {
  const steps = definition.ingest.processing.steps;
  if (steps.length === 0) {
    return null;
  }

  const producedFields = new Set<string>();
  collectProducedFields(steps, producedFields);
  if (producedFields.size === 0) {
    return null;
  }

  const sortedFields = Array.from(producedFields).sort();
  return [
    `Existing processing pipeline (${steps.length} step${
      steps.length === 1 ? '' : 's'
    }) produces these fields:`,
    ...sortedFields.map((field) => `- ${field}`),
    '',
    'These fields are populated by the pipeline at ingest time and are valid targets for partition conditions even when they appear sparsely (or not at all) in the cluster samples below — older documents indexed before the pipeline was added may not carry them yet.',
  ].join('\n');
};

/**
 * Walks a Streamlang DSL recursively, collecting the field names each step
 * produces. Defers to `extractModifiedFields` from `@kbn/streamlang` for the
 * per-action field detection (including grok/dissect capture parsing) so the
 * summary stays in sync with how Streamlang itself reasons about modified
 * fields, and recurses into condition blocks (`if/then/else`) which the
 * single-step helper does not handle.
 *
 * Deletion tracking: unconditional `remove`, `remove_by_prefix`, and `rename`
 * steps erase their source field(s) from the accumulator so the LLM summary
 * only lists fields that are actually present after the full pipeline runs.
 * Conditional removals (steps with a `where` clause) are intentionally left
 * in the set — the field still exists for documents that don't match the
 * predicate, so it remains a valid partition target.
 */
const collectProducedFields = (steps: StreamlangStep[], acc: Set<string>): void => {
  for (const step of steps) {
    if (isConditionBlock(step)) {
      collectProducedFields(step.condition.steps, acc);
      if (step.condition.else) {
        collectProducedFields(step.condition.else, acc);
      }
      continue;
    }

    if (!isActionBlock(step)) continue;

    // Only track deletions for unconditional steps — a step with a `where`
    // clause only runs for matching documents so its source field may still
    // be present elsewhere and remain a valid partition target.
    const isUnconditional = !('where' in step) || !step.where;

    if (isUnconditional) {
      if (step.action === 'remove' && step.from) {
        acc.delete(step.from);
      } else if (step.action === 'remove_by_prefix' && step.from) {
        const prefix = step.from;
        for (const field of acc) {
          if (field.startsWith(prefix)) {
            acc.delete(field);
          }
        }
      } else if (step.action === 'rename' && step.from) {
        // The source field is moved — delete it; extractModifiedFields will
        // add the destination field to the accumulator below.
        acc.delete(step.from);
      }
    }

    for (const field of extractModifiedFields(step)) {
      acc.add(field);
    }
  }
};
