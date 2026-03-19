/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { selectEvaluators } from '@kbn/evals';
import type { BaseFeature } from '@kbn/streams-schema';
import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { createScenarioCriteriaLlmEvaluator } from './scenario_criteria_llm_evaluator';
import { matchesEvidenceText } from './evidence_text_matching';

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
      return { score: 1, explanation: 'No KI features to validate (vacuously valid)' };
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
 * Parses a `field.path=value` evidence string into key-value pairs.
 * Handles compound evidence like `"http.method=GET http.url=/api/users"`.
 * Returns an empty array if the string doesn't match the pattern.
 */
function parseKeyValuePairs(evidence: string): Array<{ key: string; value: string }> {
  const regex =
    /([a-zA-Z_][a-zA-Z0-9_]*(?:\.(?:[a-zA-Z_][a-zA-Z0-9_]*|\d+))*)\s*=\s*([^\s]+(?:\s+(?![a-zA-Z_][a-zA-Z0-9_]*(?:\.(?:[a-zA-Z_][a-zA-Z0-9_]*|\d+))*\s*=)[^\s]+)*)/g;
  const pairs: Array<{ key: string; value: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(evidence)) !== null) {
    pairs.push({ key: match[1], value: match[2] });
  }

  return pairs;
}

function getNestedValue(doc: Record<string, unknown>, path: string): unknown {
  if (path in doc) {
    return doc[path];
  }

  return get(doc, path);
}

/**
 * Recursively extracts all string values from a document object,
 * so direct-quote evidence can be matched against any field.
 */
function getAllStringValues(doc: Record<string, unknown>): string[] {
  const values: string[] = [];

  const walk = (obj: unknown) => {
    if (typeof obj === 'string') {
      values.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        walk(item);
      }
    } else if (obj !== null && typeof obj === 'object') {
      for (const val of Object.values(obj as Record<string, unknown>)) {
        walk(val);
      }
    }
  };

  walk(doc);
  return values;
}

/**
 * Checks whether a single evidence string is grounded in the input documents.
 *
 * 1. `field.path=value` evidence: parses key-value pairs and checks that at
 *    least one pair matches a document field value.
 * 2. Direct quote evidence: checks if the text appears as a substring in any
 *    string value across all document fields.
 */
function isEvidenceGrounded(evidence: string, documents: Array<Record<string, unknown>>): boolean {
  const matchesStringValue = documents.some((doc) => {
    const allValues = getAllStringValues(doc);
    return allValues.some((val) => matchesEvidenceText(val, evidence));
  });

  if (matchesStringValue) {
    return true;
  }

  const kvPairs = parseKeyValuePairs(evidence);
  if (kvPairs.length > 0) {
    const matchesDocumentKey = documents.some((doc) =>
      kvPairs.some(({ key, value }) => {
        const docValue = getNestedValue(doc, key);
        return docValue !== undefined && String(docValue).includes(value);
      })
    );
    if (matchesDocumentKey) {
      return true;
    }
  }

  return false;
}

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
      const resolved = source ?? doc;
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
        score: 1,
        explanation: 'No KI features emitted — confidence bounds satisfied trivially',
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
      return { score: 1, explanation: 'No type assertions specified — skipping' };
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
