/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasSameFingerprint, type BaseFeature } from '@kbn/streams-schema';
import { uniqBy, uniqWith } from 'lodash';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import { SemanticUniquenessPrompt } from './semantic_uniqueness_prompt';
import { IdConsistencyPrompt } from './id_consistency_prompt';

/**
 * Checks that all unique-by-id features are semantically distinct.
 * Score = K / N, where K = semantic clusters and N = unique ids.
 * A score < 1 means there are semantic duplicates in the feature set.
 */
export const createSemanticUniquenessEvaluator = ({
  inferenceClient,
}: {
  inferenceClient: BoundInferenceClient;
}) => ({
  name: 'llm_semantic_uniqueness',
  kind: 'LLM' as const,
  evaluate: async ({
    input,
    output,
  }: {
    input: { stream_name: string };
    output: { runs?: Array<{ features: BaseFeature[] }> };
  }) => {
    const runs: Array<{ features: BaseFeature[] }> = output?.runs ?? [];
    const allFeatures = runs.flatMap((run) => run.features);

    if (runs.length === 0 || allFeatures.length === 0) {
      return { score: 1, explanation: 'No features to evaluate' };
    }

    const featuresUniqueById = uniqBy(allFeatures, (feature) => feature.id.toLowerCase());
    const uniqueById = featuresUniqueById.length;
    const uniqueByFingerprint = uniqWith(featuresUniqueById, hasSameFingerprint).length;

    const compactUniqueFeatures = featuresUniqueById
      .map((feature) => ({
        id: feature.id.toLowerCase(),
        type: feature.type,
        subtype: feature.subtype,
        title: feature.title,
        properties: feature.properties,
        description: feature.description?.slice(0, 300),
      }))
      .sort((a, b) =>
        `${a.type}:${a.subtype ?? ''}:${a.id}`.localeCompare(`${b.type}:${b.subtype ?? ''}:${b.id}`)
      );

    const response = await executeUntilValid({
      prompt: SemanticUniquenessPrompt,
      inferenceClient,
      input: {
        stream_name: input?.stream_name,
        totals: JSON.stringify({
          runs: runs.length,
          total_features: allFeatures.length,
          unique_by_id: uniqueById,
          unique_by_fingerprint: uniqueByFingerprint,
        }),
        unique_features_by_id: JSON.stringify(compactUniqueFeatures),
      },
      finalToolChoice: { function: 'analyze' as const },
      maxRetries: 3,
      toolCallbacks: {
        analyze: async (toolCall) => ({
          response: toolCall.function.arguments,
        }),
      },
    });

    const { k, explanation, duplicate_clusters } = response.toolCalls[0].function.arguments;
    const score = uniqueById > 0 ? k / uniqueById : 1;

    return {
      score,
      explanation,
      metadata: {
        n: uniqueById,
        k,
        duplicate_rate: uniqueById > 0 ? 1 - k / uniqueById : 0,
        duplicate_clusters,
        unique_by_id: uniqueById,
        unique_by_fingerprint: uniqueByFingerprint,
      },
    };
  },
});

/**
 * Checks that features sharing the same id across runs refer to the same concept.
 * Only ids with differing fingerprints across runs are sent to the LLM — trivially
 * identical occurrences are counted as consistent without an LLM call.
 * Score = (trivially_consistent + llm_consistent) / total_multi_occurrence_ids.
 */
export const createIdConsistencyEvaluator = ({
  inferenceClient,
}: {
  inferenceClient: BoundInferenceClient;
}) => ({
  name: 'llm_id_consistency',
  kind: 'LLM' as const,
  evaluate: async ({
    input,
    output,
  }: {
    input: { stream_name: string };
    output: { runs?: Array<{ features: BaseFeature[] }> };
  }) => {
    const runs: Array<{ features: BaseFeature[] }> = output?.runs ?? [];
    const allFeatures = runs.flatMap((run) => run.features);

    if (runs.length <= 1 || allFeatures.length === 0) {
      return { score: 1, explanation: 'Not enough runs to evaluate id consistency' };
    }

    const featuresById = new Map<string, BaseFeature[]>();
    runs.forEach((run) => {
      run.features.forEach((feature) => {
        const list = featuresById.get(feature.id) ?? [];
        list.push(feature);
        featuresById.set(feature.id, list);
      });
    });

    const multiOccurrenceEntries = [...featuresById.entries()].filter(
      ([, features]) => features.length > 1
    );

    if (multiOccurrenceEntries.length === 0) {
      return {
        score: 1,
        explanation: 'No id appears in more than one run; id consistency cannot be assessed',
      };
    }

    const totalMultiOccurrence = multiOccurrenceEntries.length;

    const triviallyConsistent = multiOccurrenceEntries.filter(
      ([, features]) => uniqWith(features, hasSameFingerprint).length === 1
    );
    const ambiguous = multiOccurrenceEntries.filter(
      ([, features]) => uniqWith(features, hasSameFingerprint).length > 1
    );

    if (ambiguous.length === 0) {
      return {
        score: 1,
        explanation: `All ${totalMultiOccurrence} multi-occurrence ids are trivially consistent (same fingerprint across runs)`,
      };
    }

    const idGroups = ambiguous.map(([id, features]) => ({
      id,
      variants: uniqWith(features, hasSameFingerprint).map((f) => ({
        type: f.type,
        subtype: f.subtype,
        title: f.title,
        properties: f.properties,
        description: f.description?.slice(0, 200),
      })),
    }));

    const response = await executeUntilValid({
      prompt: IdConsistencyPrompt,
      inferenceClient,
      input: {
        stream_name: input?.stream_name,
        context: JSON.stringify({
          total_multi_occurrence_ids: totalMultiOccurrence,
          trivially_consistent_ids: triviallyConsistent.length,
          ambiguous_ids_sent_to_llm: ambiguous.length,
        }),
        id_groups: JSON.stringify(idGroups),
      },
      finalToolChoice: { function: 'evaluate' as const },
      maxRetries: 3,
      toolCallbacks: {
        evaluate: async (toolCall) => ({
          response: toolCall.function.arguments,
        }),
      },
    });

    const { collision_groups, explanation } = response.toolCalls[0].function.arguments;

    const llmConsistent = ambiguous.length - collision_groups.length;
    const finalScore = (triviallyConsistent.length + llmConsistent) / totalMultiOccurrence;

    return {
      score: finalScore,
      explanation,
      metadata: {
        total_multi_occurrence_ids: totalMultiOccurrence,
        trivially_consistent: triviallyConsistent.length,
        ambiguous: ambiguous.length,
        collisions: collision_groups.length,
        collision_groups,
      },
    };
  },
});

/**
 * Structural duplication evaluator (CODE). Checks that features with different
 * ids don't share the same fingerprint (type + subtype + properties).
 * Score = 1 - (missed_duplicates / unique_by_id).
 */
export const featureDuplicationEvaluator = {
  name: 'features_duplication',
  kind: 'CODE' as const,
  evaluate: async ({ output }: { output: { runs?: Array<{ features: BaseFeature[] }> } }) => {
    const allFeatures = output.runs?.flatMap((run) => run.features) || [];

    if (allFeatures.length === 0) {
      return { score: 1, explanation: 'No features to evaluate' };
    }

    const uniqueById = uniqBy(allFeatures, (feature) => feature.id.toLowerCase());
    const dedupedByFingerprint = uniqWith(uniqueById, hasSameFingerprint);
    const uniqueByFingerprint = dedupedByFingerprint.length;

    const structuralDuplicateGroups = dedupedByFingerprint
      .map((representative) => ({
        ids: uniqueById
          .filter((f) => hasSameFingerprint(f, representative))
          .map((f) => f.id.toLowerCase()),
        type: representative.type,
        subtype: representative.subtype,
        properties: representative.properties,
      }))
      .filter((group) => group.ids.length > 1);

    const missedDuplicates = uniqueById.length - uniqueByFingerprint;

    const score = uniqueById.length > 0 ? Math.max(0, 1 - missedDuplicates / uniqueById.length) : 1;

    return {
      score,
      metadata: {
        total_features: allFeatures.length,
        unique_by_id: uniqueById.length,
        unique_by_fingerprint: uniqueByFingerprint,
        missed_duplicates: missedDuplicates,
        structural_duplicate_groups: structuralDuplicateGroups,
      },
    };
  },
};
