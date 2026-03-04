/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnDatemath from '@kbn/datemath';
import { getSampleDocuments } from '@kbn/ai-tools';
import { tags } from '@kbn/scout';
import { hasSameFingerprint, type BaseFeature } from '@kbn/streams-schema';
import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { uniqBy, uniqWith } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { evaluate } from '../src/evaluate';
import { FEATURES_DUPLICATION_DATASETS } from './features_duplication_datasets';
import { indexSynthtraceScenario } from './synthtrace_helpers';

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe('Streams features duplication (harness)', () => {
  const from = kbnDatemath.parse('now-10m')!;
  const to = kbnDatemath.parse('now')!;

  async function runRepeatedFeatureIdentification({
    esClient,
    streamName,
    runs,
    inferenceClient,
    logger,
    sampleSize,
  }: {
    esClient: ElasticsearchClient;
    streamName: string;
    runs: number;
    inferenceClient: BoundInferenceClient;
    logger: Logger;
    sampleSize: number;
  }): Promise<{
    runs: Array<{
      features: BaseFeature[];
    }>;
  }> {
    const outputs: Array<{ features: BaseFeature[] }> = [];

    for (let i = 0; i < runs; i++) {
      const { hits: sampleDocuments } = await getSampleDocuments({
        esClient,
        index: streamName,
        size: sampleSize,
        start: from.valueOf(),
        end: to.valueOf(),
      });

      const { features } = await identifyFeatures({
        streamName,
        sampleDocuments,
        systemPrompt: featuresPrompt,
        inferenceClient,
        logger,
        signal: new AbortController().signal,
      });

      outputs.push({ features });
    }

    return { runs: outputs };
  }

  const SEMANTIC_UNIQUENESS_OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
      k: {
        type: 'number',
        description:
          'Number of semantic clusters you formed — each cluster = one unique real-world concept. K is always <= N (the total number of unique-by-id features provided in the input). (integer)',
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
              description: 'Feature ids that form the duplicate cluster',
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

  /**
   * Checks that all unique-by-id features are semantically distinct.
   * Score = K / N, where K = semantic clusters and N = unique ids.
   * A score < 1 means there are semantic duplicates in the feature set.
   */
  function createSemanticUniquenessEvaluator({
    inferenceClient,
  }: {
    inferenceClient: BoundInferenceClient;
  }) {
    return {
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
        // Fingerprint uniqueness computed over the already-deduplicated-by-id set,
        // so unique_by_fingerprint <= unique_by_id always holds.
        // If unique_by_fingerprint < unique_by_id, some features with different ids
        // have identical (type, subtype, properties) — a strong structural duplication signal.
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
            `${a.type}:${a.subtype ?? ''}:${a.id}`.localeCompare(
              `${b.type}:${b.subtype ?? ''}:${b.id}`
            )
          );

        const result = await inferenceClient.output({
          id: 'semantic_uniqueness_analysis',
          system: `You are an automated quality-assurance LLM evaluating feature extraction from log streams.

Your task: given a list of features already de-duplicated by id (one representative per unique id), determine whether all unique ids are truly semantically distinct, or whether some are SEMANTIC DUPLICATES — features that refer to the exact same underlying real-world component or fact, even if their ids, titles, or descriptions differ slightly.

Definitions:
- Only compare features within the same category: type + subtype must match for two features to be considered duplicates.
- If ambiguous, treat as NOT duplicates.
- Same technology family ≠ duplicates. Only truly interchangeable features are duplicates.
- Two features are duplicates only if an operator would consider them interchangeable: knowing one tells you everything knowing the other would.

Burden of proof for each cluster:
- You must be able to state in one sentence what single real-world thing all members refer to.
- A valid identity statement names a specific component or process, not a category or domain.
- If you cannot write the one-sentence identity, the features are NOT duplicates.

Method:
1. Read the full list of unique features.
2. Apply the burden-of-proof test before finalising each cluster.
3. Return K = the number of semantic clusters you formed. K must be <= N (provided in the input as unique_by_id).`,
          input: JSON.stringify({
            stream_name: input?.stream_name,
            totals: {
              runs: runs.length,
              total_features: allFeatures.length,
              unique_by_id: uniqueById,
              unique_by_fingerprint: uniqueByFingerprint,
            },
            unique_features_by_id: compactUniqueFeatures,
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
    };
  }

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
              description: 'The feature id that is a collision',
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
   * Checks that features sharing the same id across runs refer to the same concept.
   * Only ids with differing fingerprints across runs are sent to the LLM — trivially
   * identical occurrences are counted as consistent without an LLM call.
   * Score = (trivially_consistent + llm_consistent) / total_multi_occurrence_ids.
   */
  function createIdConsistencyEvaluator({
    inferenceClient,
  }: {
    inferenceClient: BoundInferenceClient;
  }) {
    return {
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

        // Only ids appearing more than once are candidates for consistency checks
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

        // Split into trivially consistent (same fingerprint every time) and ambiguous (different fingerprints)
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

        // Build a compact representation of the ambiguous groups for the LLM
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

        const result = await inferenceClient.output({
          id: 'id_consistency_analysis',
          system: `You are an automated quality-assurance LLM evaluating feature extraction from log streams.

You are given groups of features that share the same id but were produced with different content across multiple runs on the SAME stream.
Features with the same id should always represent the same underlying real-world concept. An id collision — the same id used for genuinely different concepts — is a bug.

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

        // C = ambiguous groups the LLM judged consistent; computed from what we know locally
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
    };
  }

  const duplicationEvaluator = {
    name: 'features_duplication',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: { runs?: Array<{ features: BaseFeature[] }> } }) => {
      const allFeatures = output.runs?.flatMap((run) => run.features) || [];

      if (allFeatures.length === 0) {
        return { score: 1, explanation: 'No features to evaluate' };
      }

      // Work on one representative per id. This makes the relationship
      // unique_by_fingerprint <= unique_by_id a hard invariant and keeps
      // missed_duplicates unambiguous: it simply equals unique_by_id - unique_by_fingerprint
      // (same content, different ids). Id collisions (same id, different content across runs)
      // are a separate concern handled by the llm_id_consistency evaluator.
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

      const score =
        uniqueById.length > 0 ? Math.max(0, 1 - missedDuplicates / uniqueById.length) : 1;

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

  FEATURES_DUPLICATION_DATASETS.forEach((dataset) => {
    evaluate.describe(dataset.name, { tag: tags.stateful.classic }, () => {
      evaluate.beforeAll(async ({ apiServices }) => {
        await apiServices.streams.enable();
      });

      evaluate.afterAll(async ({ apiServices, esClient }) => {
        await apiServices.streams.disable();
        await esClient.indices.deleteDataStream({
          name: 'logs*',
        });
      });

      evaluate(
        dataset.name,
        async ({
          config,
          esClient,
          inferenceClient,
          evaluationConnector,
          logger,
          executorClient,
        }) => {
          const evaluatorInferenceClient = inferenceClient.bindTo({
            connectorId: evaluationConnector.id,
          });

          await indexSynthtraceScenario({
            scenario: dataset.input.scenario,
            scenarioOpts: dataset.input.scenarioOpts,
            config,
            from,
            to,
          });

          await esClient.indices.refresh({ index: dataset.input.stream_name });

          await executorClient.runExperiment(
            {
              dataset: {
                name: dataset.name,
                description: dataset.description,
                examples: [{ input: dataset.input }],
              },
              task: async ({
                input,
              }: {
                input: { stream_name: string; runs: number; sample_document_count: number };
              }) => {
                return runRepeatedFeatureIdentification({
                  esClient,
                  streamName: input.stream_name,
                  runs: input.runs,
                  inferenceClient,
                  logger,
                  sampleSize: input.sample_document_count,
                });
              },
            },
            [
              duplicationEvaluator,
              createSemanticUniquenessEvaluator({ inferenceClient: evaluatorInferenceClient }),
              createIdConsistencyEvaluator({ inferenceClient: evaluatorInferenceClient }),
            ]
          );
        }
      );
    });
  });
});
