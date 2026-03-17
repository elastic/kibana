/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasSameFingerprint, type BaseFeature } from '@kbn/streams-schema';
import { uniqBy, uniqWith } from 'lodash';
import type { BoundInferenceClient } from '@kbn/inference-common';

const SEMANTIC_UNIQUENESS_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    k: {
      type: 'number',
      description:
        'Number of semantic clusters you formed - each cluster = one unique real-world concept. K is always <= N (the total number of unique-by-id KIs provided in the input). (integer)',
    },
    explanation: {
      type: 'string',
      description:
        'Your reasoning: list confirmed duplicate clusters with their one-sentence identity statements, and briefly note what drives duplication (id naming instability, overly generic ids, etc.)',
    },
    duplicate_clusters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'KI ids that form the duplicate cluster',
          },
          identity_statement: {
            type: 'string',
            description:
              'One sentence naming the single real-world component or process all members refer to',
          },
        },
        required: ['ids', 'identity_statement'],
      },
      description: 'Up to 5 of the largest confirmed duplicate clusters',
    },
  },
  required: ['k', 'explanation', 'duplicate_clusters'],
} as const;

const ID_CONSISTENCY_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    collision_groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The KI id that is a collision',
          },
          reason: {
            type: 'string',
            description:
              'One sentence explaining why the variants conflict (e.g. "variant A describes X while variant B describes Y")',
          },
        },
        required: ['id', 'reason'],
      },
      description:
        'Id groups you judge as INCONSISTENT (genuine collisions). Omit groups where variants clearly refer to the same underlying concept, even if wording differs.',
    },
    explanation: {
      type: 'string',
      description:
        'Brief summary: note what drives collisions (overly generic ids, type confusion, unstable naming, etc.)',
    },
  },
  required: ['collision_groups', 'explanation'],
} as const;

/**
 * Checks that all unique-by-id KIs are semantically distinct.
 * Score = K / N, where K = semantic clusters and N = unique ids.
 * A score < 1 means there are semantic duplicates in the KI set.
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
    const allKIs = runs.flatMap((run) => run.features);

    if (runs.length === 0 || allKIs.length === 0) {
      return { score: 1, explanation: 'No KIs to evaluate' };
    }

    const kisUniqueById = uniqBy(allKIs, (ki) => ki.id.toLowerCase());
    const uniqueById = kisUniqueById.length;
    const uniqueByFingerprint = uniqWith(kisUniqueById, hasSameFingerprint).length;

    const compactUniqueKIs = kisUniqueById
      .map((ki) => ({
        id: ki.id.toLowerCase(),
        type: ki.type,
        subtype: ki.subtype,
        title: ki.title,
        properties: ki.properties,
        description: ki.description?.slice(0, 300),
      }))
      .sort((a, b) =>
        `${a.type}:${a.subtype ?? ''}:${a.id}`.localeCompare(`${b.type}:${b.subtype ?? ''}:${b.id}`)
      );

    const result = await inferenceClient.output({
      id: 'semantic_uniqueness_analysis',
      system: `You are an automated quality-assurance LLM evaluating Knowledge Indicator (KI) extraction from log streams.

Your task: given a list of KIs already de-duplicated by id (one representative per unique id), determine whether all unique ids are truly semantically distinct, or whether some are SEMANTIC DUPLICATES — KIs that refer to the exact same underlying real-world component or fact, even if their ids, titles, or descriptions differ slightly.

Definitions:
- Only compare KIs within the same category: type + subtype must match for two KIs to be considered duplicates.
- If ambiguous, treat as NOT duplicates.
- Same technology family ≠ duplicates. Only truly interchangeable KIs are duplicates.
- Two KIs are duplicates only if an operator would consider them interchangeable: knowing one tells you everything knowing the other would.

Burden of proof for each cluster:
- You must be able to state in one sentence what single real-world thing all members refer to.
- A valid identity statement names a specific component or process, not a category or domain.
- If you cannot write the one-sentence identity, the KIs are NOT duplicates.

Method:
1. Read the full list of unique KIs.
2. Apply the burden-of-proof test before finalising each cluster.
3. Return K = the number of semantic clusters you formed. K must be <= N (provided in the input as unique_by_id).`,
      input: JSON.stringify({
        stream_name: input?.stream_name,
        totals: {
          runs: runs.length,
          total_kis: allKIs.length,
          unique_by_id: uniqueById,
          unique_by_fingerprint: uniqueByFingerprint,
        },
        unique_kis_by_id: compactUniqueKIs,
      }),
      schema: SEMANTIC_UNIQUENESS_OUTPUT_SCHEMA,
      retry: { onValidationError: 3 },
    });

    const { k, explanation, duplicate_clusters } = result.output;
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
 * Checks that KIs sharing the same id across runs refer to the same concept.
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
    const allKIs = runs.flatMap((run) => run.features);

    if (runs.length <= 1 || allKIs.length === 0) {
      return { score: 1, explanation: 'Not enough runs to evaluate id consistency' };
    }

    const kisById = new Map<string, BaseFeature[]>();
    runs.forEach((run) => {
      run.features.forEach((ki) => {
        const list = kisById.get(ki.id) ?? [];
        list.push(ki);
        kisById.set(ki.id, list);
      });
    });

    const multiOccurrenceEntries = [...kisById.entries()].filter(([, kis]) => kis.length > 1);

    if (multiOccurrenceEntries.length === 0) {
      return {
        score: 1,
        explanation: 'No id appears in more than one run; id consistency cannot be assessed',
      };
    }

    const totalMultiOccurrence = multiOccurrenceEntries.length;

    const triviallyConsistent = multiOccurrenceEntries.filter(
      ([, kis]) => uniqWith(kis, hasSameFingerprint).length === 1
    );
    const ambiguous = multiOccurrenceEntries.filter(
      ([, kis]) => uniqWith(kis, hasSameFingerprint).length > 1
    );

    if (ambiguous.length === 0) {
      return {
        score: 1,
        explanation: `All ${totalMultiOccurrence} multi-occurrence ids are trivially consistent (same fingerprint across runs)`,
      };
    }

    const idGroups = ambiguous.map(([id, kis]) => ({
      id,
      variants: uniqWith(kis, hasSameFingerprint).map((ki) => ({
        type: ki.type,
        subtype: ki.subtype,
        title: ki.title,
        properties: ki.properties,
        description: ki.description?.slice(0, 200),
      })),
    }));

    const result = await inferenceClient.output({
      id: 'id_consistency_analysis',
      system: `You are an automated quality-assurance LLM evaluating Knowledge Indicator (KI) extraction from log streams.

You are given groups of KIs that share the same id but were produced with different content across multiple runs on the SAME stream.
KIs with the same id should always represent the same underlying real-world concept. An id collision — the same id used for genuinely different concepts — is a bug.

Definitions:
- "Consistent": all variants in the group clearly refer to the same underlying concept, even if minor wording or property details differ.
- "Collision" (inconsistent): the same id is used for different concepts in different runs.

Method:
- For each id group, decide: consistent or collision.
- Only include groups in collision_groups that are genuine collisions.
- M (total ambiguous groups) and trivially_consistent_ids are provided as context; you do not need to report them.`,
      input: JSON.stringify({
        stream_name: input?.stream_name,
        context: {
          total_multi_occurrence_ids: totalMultiOccurrence,
          trivially_consistent_ids: triviallyConsistent.length,
          ambiguous_ids_sent_to_llm: ambiguous.length,
        },
        id_groups: idGroups,
      }),
      schema: ID_CONSISTENCY_OUTPUT_SCHEMA,
      retry: { onValidationError: 3 },
    });

    const { collision_groups, explanation } = result.output;

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
 * Structural duplication evaluator (CODE). Checks that KIs with different
 * ids don't share the same fingerprint (type + subtype + properties).
 * Score = 1 - (missed_duplicates / unique_by_id).
 */
export const kiDuplicationEvaluator = {
  name: 'ki_duplication',
  kind: 'CODE' as const,
  evaluate: async ({ output }: { output: { runs?: Array<{ features: BaseFeature[] }> } }) => {
    const allKIs = output.runs?.flatMap((run) => run.features) || [];

    if (allKIs.length === 0) {
      return { score: 1, explanation: 'No KIs to evaluate' };
    }

    const uniqueById = uniqBy(allKIs, (ki) => ki.id.toLowerCase());
    const dedupedByFingerprint = uniqWith(uniqueById, hasSameFingerprint);
    const uniqueByFingerprint = dedupedByFingerprint.length;

    const structuralDuplicateGroups = dedupedByFingerprint
      .map((representative) => ({
        ids: uniqueById
          .filter((ki) => hasSameFingerprint(ki, representative))
          .map((ki) => ki.id.toLowerCase()),
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
        total_kis: allKIs.length,
        unique_by_id: uniqueById.length,
        unique_by_fingerprint: uniqueByFingerprint,
        missed_duplicates: missedDuplicates,
        structural_duplicate_groups: structuralDuplicateGroups,
      },
    };
  },
};
