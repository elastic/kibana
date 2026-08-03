/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import type { KIFeatureExtractionEvaluator } from '../types';
import { getFeaturesFromOutput } from '../types';

/**
 * Measures the fraction of entity-type features that include a `filter` condition.
 * Only evaluated when the scenario sets `expect_entity_filters: true`.
 */
export const filterCoverageEvaluator = {
  name: 'filter_coverage',
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

    return {
      score,
      explanation:
        withoutFilter.length > 0
          ? `${withoutFilter.length}/${
              entities.length
            } entity feature(s) lack a filter: ${withoutFilter.map((f) => `"${f.id}"`).join(', ')}`
          : `All ${entities.length} entity feature(s) include a filter`,
      details: {
        totalEntities: entities.length,
        withFilter: withFilter.length,
        withoutFilter: withoutFilter.map((f) => f.id),
      },
    };
  },
} satisfies KIFeatureExtractionEvaluator;
