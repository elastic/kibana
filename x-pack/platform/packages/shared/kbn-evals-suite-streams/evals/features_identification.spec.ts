/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFeature } from '@kbn/streams-schema';
import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { get } from 'lodash';
import { tags } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import type { StreamsEvaluationWorkerFixtures } from '../src/types';
import type {
  FeatureIdentificationEvaluationDataset,
  FeatureIdentificationEvaluationExample,
  ValidFeatureType,
} from './features_identification_datasets';
import {
  FEATURE_IDENTIFICATION_DATASETS,
  VALID_FEATURE_TYPES,
} from './features_identification_datasets';

evaluate.describe.configure({ timeout: 300_000 });

/**
 * Deterministic CODE evaluators that run alongside the LLM-based criteria evaluator.
 * These verify objectively measurable properties without relying on an LLM judge.
 */

interface CodeEvaluatorParams {
  input: FeatureIdentificationEvaluationExample['input'];
  output: { features: BaseFeature[] };
  expected: FeatureIdentificationEvaluationExample['output'];
  metadata: FeatureIdentificationEvaluationExample['metadata'];
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
      (f) => !VALID_FEATURE_TYPES.includes(f.type as ValidFeatureType)
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
 */
const evidenceGroundingEvaluator = {
  name: 'evidence_grounding',
  kind: 'CODE' as const,
  evaluate: async ({ input, output }: CodeEvaluatorParams) => {
    const features = output?.features ?? [];
    const documents = input.sample_documents;

    let totalEvidence = 0;
    let groundedEvidence = 0;
    const ungroundedItems: string[] = [];

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

    const score = groundedEvidence / totalEvidence;
    return {
      score,
      explanation:
        ungroundedItems.length > 0
          ? `${
              ungroundedItems.length
            }/${totalEvidence} evidence strings not grounded: ${ungroundedItems
              .slice(0, 3)
              .join('; ')}`
          : `All ${totalEvidence} evidence strings are grounded in input documents`,
      details: { totalEvidence, groundedEvidence, ungroundedItems },
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

const CODE_EVALUATORS = [
  typeValidationEvaluator,
  evidenceGroundingEvaluator,
  featureCountEvaluator,
  confidenceBoundsEvaluator,
  typeAssertionsEvaluator,
];

evaluate.describe(
  'Streams features identification',
  { tag: tags.serverless.observability.complete },
  () => {
    async function runFeatureIdentificationExperiment(
      dataset: FeatureIdentificationEvaluationDataset,
      {
        phoenixClient,
        inferenceClient,
        logger,
        evaluators,
      }: Pick<
        StreamsEvaluationWorkerFixtures,
        'phoenixClient' | 'inferenceClient' | 'logger' | 'evaluators'
      >
    ) {
      await phoenixClient.runExperiment(
        {
          dataset,
          concurrency: 1,
          task: async ({ input }: { input: FeatureIdentificationEvaluationExample['input'] }) => {
            const { features } = await identifyFeatures({
              streamName: 'test',
              sampleDocuments: input.sample_documents,
              systemPrompt: featuresPrompt,
              inferenceClient,
              logger,
              signal: new AbortController().signal,
            });

            return { features };
          },
        },
        [
          {
            name: 'feature_correctness',
            kind: 'LLM' as const,
            evaluate: async ({ input, output, expected, metadata }) => {
              const result = await evaluators.criteria(expected.criteria).evaluate({
                input,
                expected,
                output: output.features,
                metadata,
              });

              return result;
            },
          },
          ...CODE_EVALUATORS,
        ]
      );
    }

    // Run evaluation for each dataset
    FEATURE_IDENTIFICATION_DATASETS.forEach((dataset) => {
      evaluate.describe(dataset.name, () => {
        evaluate(
          'feature identification',
          async ({ evaluators, inferenceClient, logger, phoenixClient }) => {
            await runFeatureIdentificationExperiment(dataset, {
              inferenceClient,
              logger,
              phoenixClient,
              evaluators,
            });
          }
        );
      });
    });
  }
);
