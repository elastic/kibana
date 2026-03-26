/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { selectEvaluators } from '@kbn/evals';
import { type BaseFeature } from '@kbn/streams-schema';
import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { flattenObject } from '@kbn/object-utils';
import { createScenarioCriteriaLlmEvaluator } from './scenario_criteria_llm_evaluator';
import { isEvidenceGrounded } from './evidence_grounding';

export const VALID_KI_FEATURE_TYPES = [
  'entity',
  'infrastructure',
  'technology',
  'dependency',
  'schema',
] as const;

export type ValidKIFeatureType = (typeof VALID_KI_FEATURE_TYPES)[number];

export interface KIFeatureExtractionEvaluationExample {
  input: {
    sample_documents: Array<SearchHit<Record<string, unknown>>>;
  };
  output: {
    criteria: EvaluationCriterion[];
    weight?: number;
    min_features?: number;
    max_features?: number;
    max_confidence?: number;
    required_types?: ValidKIFeatureType[];
    forbidden_types?: ValidKIFeatureType[];
    expect_entity_filters?: boolean;
    expected_ground_truth: string;
    expected?: string;
  };
  metadata: Record<string, unknown> | null;
}

export interface KIFeatureExtractionEvaluationDataset {
  name: string;
  description: string;
  examples: KIFeatureExtractionEvaluationExample[];
}

interface KIFeatureExtractionTaskOutput {
  features: BaseFeature[];
  traceId?: string | null;
}

type KIFeatureExtractionOutput = BaseFeature[] | KIFeatureExtractionTaskOutput;

type KIFeatureExtractionEvaluator = Evaluator<
  KIFeatureExtractionEvaluationExample,
  KIFeatureExtractionOutput
>;

const getFeaturesFromOutput = (output: KIFeatureExtractionOutput | undefined): BaseFeature[] => {
  if (!output) {
    return [];
  }
  return Array.isArray(output) ? output : output.features ?? [];
};

/**
 * Validates that every KI's `type` is one of the valid KI types.
 * Other schema fields (id, description, confidence, etc.) are already enforced
 * by the inference client's tool output schema in the prompt.ts file.
 */
const typeValidationEvaluator = {
  name: 'type_validation',
  kind: 'CODE' as const,
  evaluate: async ({ output }) => {
    const features = getFeaturesFromOutput(output);
    if (features.length === 0) {
      return { score: null, explanation: 'No KI features to validate' };
    }

    const invalidFeatures = features.filter(
      (feature) => !VALID_KI_FEATURE_TYPES.includes(feature.type as unknown as ValidKIFeatureType)
    );

    const score = (features.length - invalidFeatures.length) / features.length;

    return {
      score,
      explanation:
        invalidFeatures.length > 0
          ? `Invalid types: ${invalidFeatures
              .map((feature) => `"${feature.id}" has type "${feature.type}"`)
              .join('; ')} (expected one of: ${VALID_KI_FEATURE_TYPES.join(', ')})`
          : 'All KI features have a valid type',
      details: {
        total: features.length,
        invalidFeatures: invalidFeatures.map((feature) => ({
          id: feature.id,
          type: feature.type,
        })),
      },
    };
  },
} satisfies KIFeatureExtractionEvaluator;

/**
 * Checks that every evidence string in every KI is grounded in the input
 * documents — either as a `field.path=value` snippet matching a document field,
 * or as a direct quote appearing in any string value.
 *
 * When KI features include `evidence_doc_ids`, additionally validates that:
 * 1. All referenced `_id`s exist in the input documents.
 * 2. Evidence strings are grounded in the specific referenced docs, not just
 *    any input document.
 */
const evidenceGroundingEvaluator = {
  name: 'evidence_grounding',
  kind: 'CODE' as const,
  evaluate: async ({ input, output }) => {
    const features = getFeaturesFromOutput(output);
    const rawDocs: Array<Record<string, unknown>> = input.sample_documents.map((hit) => ({
      _id: hit._id,
      _source: hit._source,
    }));

    const docsById = new Map<string, Record<string, unknown>>();
    const documents = rawDocs.map((doc) => {
      const id = typeof doc._id === 'string' ? doc._id : undefined;
      const source =
        doc._source != null && typeof doc._source === 'object'
          ? (doc._source as Record<string, unknown>)
          : undefined;
      // flatten the object so we can lookup evidence keys by dotted path
      const resolved = flattenObject(source ?? doc);
      if (id) {
        docsById.set(id, resolved);
      }
      return resolved;
    });

    let totalEvidence = 0;
    let groundedEvidence = 0;
    const ungroundedItems: string[] = [];

    let totalDocIds = 0;
    let validDocIds = 0;
    let totalRefEvidence = 0;
    let groundedRefEvidence = 0;
    const docIdIssues: string[] = [];

    for (const feature of features) {
      const evidenceList = feature.evidence ?? [];
      for (const evidence of evidenceList) {
        totalEvidence++;
        if (isEvidenceGrounded(evidence, documents)) {
          groundedEvidence++;
        } else {
          ungroundedItems.push(`KI feature "${feature.id}": "${evidence}"`);
        }
      }

      const docIds = feature.evidence_doc_ids ?? [];
      if (docIds.length > 0) {
        const refDocs: Array<Record<string, unknown>> = [];
        for (const docId of docIds) {
          totalDocIds++;
          const doc = docsById.get(docId);
          if (doc) {
            validDocIds++;
            refDocs.push(doc);
          } else {
            docIdIssues.push(`KI feature "${feature.id}": unknown doc ID "${docId}"`);
          }
        }

        if (refDocs.length > 0) {
          for (const evidence of evidenceList) {
            totalRefEvidence++;
            if (isEvidenceGrounded(evidence, refDocs)) {
              groundedRefEvidence++;
            } else {
              docIdIssues.push(
                `KI feature "${feature.id}": evidence not in referenced docs: "${evidence}"`
              );
            }
          }
        }
      }
    }

    if (totalEvidence === 0) {
      return {
        score: features.length === 0 ? 1 : 0,
        explanation:
          features.length === 0
            ? 'No KI features, no evidence to check'
            : 'KI features present but none have evidence arrays',
      };
    }

    const groundingScore = groundedEvidence / totalEvidence;
    const docIdScore =
      totalDocIds > 0
        ? (validDocIds / totalDocIds +
            (totalRefEvidence > 0 ? groundedRefEvidence / totalRefEvidence : 1)) /
          2
        : 1;
    const score = totalDocIds > 0 ? (groundingScore + docIdScore) / 2 : groundingScore;

    const allIssues = [...ungroundedItems, ...docIdIssues];
    return {
      score,
      explanation:
        allIssues.length > 0
          ? `${allIssues.slice(0, 5).join('; ')}`
          : `All ${totalEvidence} evidence strings are grounded` +
            (totalDocIds > 0 ? ` and all ${totalDocIds} doc IDs are valid` : ''),
      details: {
        totalEvidence,
        groundedEvidence,
        ungroundedItems,
        totalDocIds,
        validDocIds,
        totalRefEvidence,
        groundedRefEvidence,
        docIdIssues,
      },
    };
  },
} satisfies KIFeatureExtractionEvaluator;

/**
 * If min_features or max_features is specified in expected output,
 * verifies the KI feature count falls within bounds with proportional penalties.
 */
const kiFeatureCountEvaluator = {
  name: 'ki_feature_count',
  kind: 'CODE' as const,
  evaluate: async ({ output, expected }) => {
    const count = getFeaturesFromOutput(output).length;
    const { min_features = -Infinity, max_features = Infinity } = expected;

    const issues: string[] = [];
    let score = 1;

    if (count < min_features) {
      issues.push(`Expected at least ${min_features} KI feature(s), got ${count}`);
      score = min_features > 0 ? Math.max(0, count / min_features) : 0;
    }
    if (count > max_features) {
      issues.push(`Expected at most ${max_features} KI feature(s), got ${count}`);
      score = max_features > 0 ? Math.max(0, 1 - (count - max_features) / max_features) : 0;
    }

    return {
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `KI feature count ${count} is within bounds [${min_features}, ${max_features}]`,
      details: { count, min_features, max_features },
    };
  },
} satisfies KIFeatureExtractionEvaluator;

/**
 * If max_confidence is specified, verifies no KI exceeds it.
 */
const confidenceBoundsEvaluator = {
  name: 'confidence_bounds',
  kind: 'CODE' as const,
  evaluate: async ({ output, expected }) => {
    const { max_confidence = 100 } = expected;

    const features = getFeaturesFromOutput(output);
    if (features.length === 0) {
      return {
        score: null,
        explanation: 'No KI features emitted',
      };
    }

    const violations = features.filter((feature) => feature.confidence > max_confidence);

    return {
      score: violations.length === 0 ? 1 : 1 - violations.length / features.length,
      explanation:
        violations.length > 0
          ? `${violations.length}/${
              features.length
            } KI features exceed max confidence ${max_confidence}: ${violations
              .map((feature) => `"${feature.id}" (${feature.confidence})`)
              .join(', ')}`
          : `All KI features have confidence ≤ ${max_confidence}`,
      details: {
        max_confidence,
        violations: violations.map((feature) => ({
          id: feature.id,
          confidence: feature.confidence,
        })),
      },
    };
  },
} satisfies KIFeatureExtractionEvaluator;

/**
 * If required_types or forbidden_types is specified, checks KI types accordingly.
 */
const typeAssertionsEvaluator = {
  name: 'type_assertions',
  kind: 'CODE' as const,
  evaluate: async ({ output, expected }) => {
    const { required_types, forbidden_types } = expected;

    if (!required_types?.length && !forbidden_types?.length) {
      return { score: null, explanation: 'No type assertions specified' };
    }

    const features = getFeaturesFromOutput(output);
    const presentTypes = new Set(features.map((feature) => feature.type));
    const issues: string[] = [];
    let totalAssertions = 0;
    let passedAssertions = 0;

    if (required_types?.length) {
      for (const requiredType of required_types) {
        totalAssertions++;
        if (presentTypes.has(requiredType)) {
          passedAssertions++;
        } else {
          issues.push(`Required type "${requiredType}" not found in output`);
        }
      }
    }

    if (forbidden_types?.length) {
      for (const forbiddenType of forbidden_types) {
        totalAssertions++;
        if (!presentTypes.has(forbiddenType)) {
          passedAssertions++;
        } else {
          const violating = features
            .filter((feature) => feature.type === forbiddenType)
            .map((feature) => feature.id);
          issues.push(
            `Forbidden type "${forbiddenType}" found in KI features: ${violating.join(', ')}`
          );
        }
      }
    }

    return {
      score: totalAssertions > 0 ? passedAssertions / totalAssertions : 1,
      explanation:
        issues.length > 0
          ? `Type assertion failures: ${issues.join('; ')}`
          : 'All type assertions passed',
      details: { presentTypes: [...presentTypes], required_types, forbidden_types, issues },
    };
  },
} satisfies KIFeatureExtractionEvaluator;

/**
 * Checks that entity-type features include a `filter` condition.
 * Only evaluated when the scenario sets `expect_entity_filters: true`.
 */
const filterPresenceEvaluator = {
  name: 'filter_presence',
  kind: 'CODE' as const,
  evaluate: async ({ output, expected }) => {
    if (!expected.expect_entity_filters) {
      return { score: null, explanation: 'Entity filter evaluation not requested — skipping' };
    }

    const features = getFeaturesFromOutput(output);
    const entities = features.filter((f) => f.type === 'entity');

    if (entities.length === 0) {
      const score = expected.required_types?.includes('entity') ? 0 : null;
      return { score, explanation: 'No entity features' };
    }

    const [withFilter, withoutFilter] = partition(entities, ({ filter }) => Boolean(filter));
    const score = withFilter.length / entities.length;
    const missing = withoutFilter.map((f) => f.id);

    return {
      score,
      explanation:
        missing.length > 0
          ? `${missing.length}/${entities.length} entity feature(s) missing filter: ${missing.join(
              ', '
            )}`
          : 'All entity features have a filter',
      details: { totalEntities: entities.length, withFilter: withFilter.length, missing },
    };
  },
} satisfies KIFeatureExtractionEvaluator;

export const createKIFeatureExtractionEvaluators = (scenarioCriteria?: {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
  criteria: EvaluationCriterion[];
}) => {
  const base = selectEvaluators([
    typeValidationEvaluator,
    evidenceGroundingEvaluator,
    kiFeatureCountEvaluator,
    confidenceBoundsEvaluator,
    typeAssertionsEvaluator,
    filterPresenceEvaluator,
  ]);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;
  return [
    ...base,
    createScenarioCriteriaLlmEvaluator<
      KIFeatureExtractionEvaluationExample,
      KIFeatureExtractionOutput
    >({
      criteriaFn: (c) =>
        criteriaFn(c) as Evaluator<KIFeatureExtractionEvaluationExample, KIFeatureExtractionOutput>,
      criteria,
      transformOutput: (output) => getFeaturesFromOutput(output),
    }),
  ];
};
