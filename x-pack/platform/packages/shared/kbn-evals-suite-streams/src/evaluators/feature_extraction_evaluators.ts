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

export const VALID_FEATURE_TYPES = [
  'entity',
  'infrastructure',
  'technology',
  'dependency',
  'schema',
] as const;

export type ValidFeatureType = (typeof VALID_FEATURE_TYPES)[number];

export interface FeatureExtractionEvaluationExample {
  input: {
    sample_documents: Array<SearchHit<Record<string, unknown>>>;
  };
  output: {
    criteria: EvaluationCriterion[];
    weight?: number;
    min_features?: number;
    max_features?: number;
    max_confidence?: number;
    required_types?: ValidFeatureType[];
    forbidden_types?: ValidFeatureType[];
    expected_ground_truth: string;
    expected?: string;
  };
  metadata: Record<string, unknown> | null;
}

export interface FeatureIdentificationEvaluationDataset {
  name: string;
  description: string;
  examples: FeatureExtractionEvaluationExample[];
}

/**
 * Deterministic CODE evaluators that run alongside the LLM-based criteria evaluator.
 * These verify objectively measurable properties without relying on an LLM judge.
 */

interface FeatureExtractionTaskOutput {
  features: BaseFeature[];
  traceId?: string | null;
}

interface CodeEvaluatorParams {
  input: Record<string, unknown>;
  output: FeatureExtractionTaskOutput;
  expected: {
    min_features?: number;
    max_features?: number;
    max_confidence?: number;
    required_types?: ValidFeatureType[];
    forbidden_types?: ValidFeatureType[];
  };
  metadata: Record<string, unknown> | null | undefined;
}

/**
 * Validates that every feature's `type` is one of the valid feature types.
 * Other schema fields (id, description, confidence, etc.) are already enforced
 * by the inference client's tool output schema in the prompt.ts file.
 */
const typeValidationEvaluator = {
  name: 'type_validation',
  kind: 'CODE' as const,
  evaluate: async ({ output }: CodeEvaluatorParams) => {
    const features = output?.features ?? [];
    if (features.length === 0) {
      return { score: 1, explanation: 'No features to validate (vacuously valid)' };
    }

    const invalidFeatures = features.filter(
      (feature) => !VALID_FEATURE_TYPES.includes(feature.type as ValidFeatureType)
    );

    const score = (features.length - invalidFeatures.length) / features.length;

    return {
      score,
      explanation:
        invalidFeatures.length > 0
          ? `Invalid types: ${invalidFeatures
              .map((f) => `"${f.id}" has type "${f.type}"`)
              .join('; ')} (expected one of: ${VALID_FEATURE_TYPES.join(', ')})`
          : 'All features have a valid type',
      details: {
        total: features.length,
        invalidFeatures: invalidFeatures.map((f) => ({ id: f.id, type: f.type })),
      },
    };
  },
};

/**
 * Parses a `field.path=value` evidence string into key-value pairs.
 * Handles compound evidence like `"http.method=GET http.url=/api/users"`.
 * Returns an empty array if the string doesn't match the pattern.
 */
function parseKeyValuePairs(evidence: string): Array<{ key: string; value: string }> {
  const regex =
    /([a-zA-Z_][a-zA-Z0-9_.]*)\s*=\s*([^\s]+(?:\s+(?![a-zA-Z_][a-zA-Z0-9_.]*\s*=)[^\s]+)*)/g;
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
  // Direct quote: check against all string values in all documents
  const matchesStringValue = documents.some((doc) => {
    const allValues = getAllStringValues(doc);
    return allValues.some((val) => val.includes(evidence) || evidence.includes(val));
  });
  if (matchesStringValue) {
    return true;
  }

  const kvPairs = parseKeyValuePairs(evidence);
  if (kvPairs.length > 0) {
    // field=value: at least one pair must match a document field
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
 * Checks that every evidence string in every feature is grounded in the input
 * documents — either as a `field.path=value` snippet matching a document field,
 * or as a direct quote appearing in any string value.
 *
 * When features include `evidence_doc_ids`, additionally validates that:
 * 1. All referenced `_id`s exist in the input documents.
 * 2. Evidence strings are grounded in the specific referenced docs, not just
 *    any input document.
 */
const evidenceGroundingEvaluator = {
  name: 'evidence_grounding',
  kind: 'CODE' as const,
  evaluate: async ({ input, output }: CodeEvaluatorParams) => {
    const features = output?.features ?? [];
    const rawDocs = Array.isArray(input.sample_documents)
      ? (input.sample_documents as Array<Record<string, unknown>>)
      : [];

    const docsById = new Map<string, Record<string, unknown>>();
    const documents = rawDocs.map((doc) => {
      const id = doc._id as string | undefined;
      const source = doc._source as Record<string, unknown> | undefined;
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
          ungroundedItems.push(`Feature "${feature.id}": "${evidence}"`);
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
            docIdIssues.push(`Feature "${feature.id}": unknown doc ID "${docId}"`);
          }
        }

        if (refDocs.length > 0) {
          for (const evidence of evidenceList) {
            totalRefEvidence++;
            if (isEvidenceGrounded(evidence, refDocs)) {
              groundedRefEvidence++;
            } else {
              docIdIssues.push(
                `Feature "${feature.id}": evidence not in referenced docs: "${evidence}"`
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
            ? 'No features, no evidence to check'
            : 'Features present but none have evidence arrays',
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
};

/**
 * If min_features or max_features is specified in expected output,
 * verifies the feature count falls within bounds.
 */
const featureCountEvaluator = {
  name: 'feature_count',
  kind: 'CODE' as const,
  evaluate: async ({ output, expected }: CodeEvaluatorParams) => {
    const count = output?.features?.length ?? 0;
    const { min_features = -Infinity, max_features = Infinity } = expected;

    const issues: string[] = [];
    if (count < min_features) {
      issues.push(`Expected at least ${min_features} features, got ${count}`);
    }
    if (count > max_features) {
      issues.push(`Expected at most ${max_features} features, got ${count}`);
    }

    return {
      score: issues.length === 0 ? 1 : 0,
      explanation:
        issues.length > 0
          ? issues.join('; ')
          : `Feature count ${count} is within bounds [${min_features ?? '∞'}, ${
              max_features ?? '∞'
            }]`,
      details: { count, min_features, max_features },
    };
  },
};

/**
 * If max_confidence is specified, verifies no feature exceeds it.
 */
const confidenceBoundsEvaluator = {
  name: 'confidence_bounds',
  kind: 'CODE' as const,
  evaluate: async ({ output, expected }: CodeEvaluatorParams) => {
    const { max_confidence = 100 } = expected;

    const features = output?.features ?? [];
    if (features.length === 0) {
      return {
        score: 1,
        explanation: 'No features emitted — confidence bounds satisfied trivially',
      };
    }

    const violations = features.filter((f) => f.confidence > max_confidence);

    return {
      score: violations.length === 0 ? 1 : 1 - violations.length / features.length,
      explanation:
        violations.length > 0
          ? `${violations.length}/${
              features.length
            } features exceed max confidence ${max_confidence}: ${violations
              .map((f) => `"${f.id}" (${f.confidence})`)
              .join(', ')}`
          : `All features have confidence ≤ ${max_confidence}`,
      details: {
        max_confidence,
        violations: violations.map((f) => ({ id: f.id, confidence: f.confidence })),
      },
    };
  },
};

/**
 * If required_types or forbidden_types is specified, checks feature types accordingly.
 */
const typeAssertionsEvaluator = {
  name: 'type_assertions',
  kind: 'CODE' as const,
  evaluate: async ({ output, expected }: CodeEvaluatorParams) => {
    const { required_types, forbidden_types } = expected;

    if (!required_types?.length && !forbidden_types?.length) {
      return { score: 1, explanation: 'No type assertions specified — skipping' };
    }

    const features = output?.features ?? [];
    const presentTypes = new Set(features.map((f) => f.type));
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
          const violating = features.filter((f) => f.type === forbiddenType).map((f) => f.id);
          issues.push(
            `Forbidden type "${forbiddenType}" found in features: ${violating.join(', ')}`
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
};

export const createFeatureExtractionEvaluators = (scenarioCriteria?: {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
  criteria: EvaluationCriterion[];
}) => {
  const base = selectEvaluators([
    typeValidationEvaluator,
    evidenceGroundingEvaluator,
    featureCountEvaluator,
    confidenceBoundsEvaluator,
    typeAssertionsEvaluator,
  ]);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;
  return [
    ...base,
    createScenarioCriteriaLlmEvaluator({
      criteriaFn,
      criteria,
      transformOutput: (output) => (output as FeatureExtractionTaskOutput)?.features,
    }),
  ];
};
