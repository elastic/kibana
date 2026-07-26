/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { getFlattenedObject } from '@kbn/std';
import {
  isAndCondition,
  isOrCondition,
  isNotCondition,
  isBinaryFilterCondition,
  getBinaryFilterOperator,
  getBinaryFilterValue,
  type Condition,
  type StringOrNumberOrBoolean,
} from '@kbn/streamlang';
import type { KIFeatureExtractionEvaluator } from '../types';
import { getFeaturesFromOutput } from '../types';

/**
 * Recursively extracts all equality (`eq`) field/value pairs from a condition tree.
 */
function extractEqPairs(
  condition: Condition
): Array<{ field: string; value: StringOrNumberOrBoolean }> {
  if (isAndCondition(condition)) {
    return condition.and.flatMap(extractEqPairs);
  }
  if (isOrCondition(condition)) {
    return condition.or.flatMap(extractEqPairs);
  }
  if (isNotCondition(condition)) {
    return extractEqPairs(condition.not);
  }
  if (isBinaryFilterCondition(condition) && getBinaryFilterOperator(condition) === 'eq') {
    return [
      { field: condition.field, value: getBinaryFilterValue(condition) as StringOrNumberOrBoolean },
    ];
  }
  return [];
}

/**
 * Checks that entity-type features' filter equality pairs are grounded in
 * the input sample documents.
 *
 * Only scores entities that actually have a filter (coverage is measured
 * separately by `filter_coverage`).
 *
 * Only evaluated when the scenario sets `expect_entity_filters: true`.
 */
export const filterGroundingEvaluator = {
  name: 'filter_grounding',
  kind: 'CODE' as const,
  evaluate: async ({ input, output, expected }) => {
    if (!expected.expect_entity_filters) {
      return { score: null, explanation: 'Entity filter evaluation not requested — skipping' };
    }

    const features = getFeaturesFromOutput(output);
    const entities = features.filter((f) => f.type === 'entity' && Boolean(f.filter));

    if (entities.length === 0) {
      return { score: null, explanation: 'No entity features with filters to check' };
    }

    const taskOutput =
      output != null && !Array.isArray(output)
        ? (output as unknown as Record<string, unknown>)
        : undefined;
    const taskDocs = taskOutput?.sample_documents as
      | Array<SearchHit<Record<string, unknown>>>
      | undefined;

    const rawDocs = taskDocs ?? input.sample_documents ?? [];
    if (rawDocs.length === 0) {
      return { score: null, explanation: 'No sample documents available' };
    }

    const flatDocs = rawDocs.map((hit) => ({
      ...((hit.fields as Record<string, unknown>) ?? {}),
      ...getFlattenedObject((hit._source ?? {}) as Record<string, unknown>),
    }));

    const perEntityDetails: Array<{
      id: string;
      entityScore: number;
      issues: string[];
      filter: Condition;
    }> = [];

    for (const entity of entities) {
      const condition = entity.filter as Condition;
      const eqPairs = extractEqPairs(condition);

      if (eqPairs.length === 0) {
        perEntityDetails.push({
          id: entity.id,
          entityScore: 0,
          issues: ['filter contains no eq conditions — cannot verify grounding'],
          filter: condition,
        });
        continue;
      }

      const ungroundedPairs: string[] = [];
      for (const { field, value } of eqPairs) {
        const valueStr = String(value);
        const grounded = flatDocs.some((doc) => {
          const docValue = doc[field];
          return docValue !== undefined && String(docValue) === valueStr;
        });
        if (!grounded) {
          ungroundedPairs.push(`${field}=${valueStr} was not found in the input documents`);
        }
      }

      const groundedRatio = (eqPairs.length - ungroundedPairs.length) / eqPairs.length;
      perEntityDetails.push({
        id: entity.id,
        entityScore: groundedRatio,
        issues: ungroundedPairs,
        filter: condition,
      });
    }

    const score =
      perEntityDetails.reduce((sum, { entityScore }) => sum + entityScore, 0) /
      perEntityDetails.length;

    const issueLines = perEntityDetails
      .filter(({ issues }) => issues.length > 0)
      .map(
        ({ id, entityScore, issues }) =>
          `"${id}" (score=${entityScore.toFixed(2)}): ${issues.join(', ')}`
      );

    return {
      score,
      explanation:
        issueLines.length > 0
          ? `Filter grounding issues — ${issueLines.join('; ')}`
          : `All ${entities.length} entity filter(s) are grounded in input documents`,
      details: {
        totalEntities: entities.length,
        perEntity: perEntityDetails,
      },
    };
  },
} satisfies KIFeatureExtractionEvaluator;
