/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionsProvider } from '../shared/suggestions/types';
import type { EvaluationDefinition, StatDefinition } from './form_types';
import { getAvailableMetricLabels } from './form_types';

/**
 * Builds a suggestions provider offering the metric labels (stats + other evaluations)
 * available to reference from an evaluation expression, excluding the evaluation's own label
 * to avoid self-reference.
 */
export const createMetricSuggestionsProvider = (
  stats: StatDefinition[],
  evaluations: EvaluationDefinition[],
  excludeLabel?: string
): SuggestionsProvider => {
  const labels = getAvailableMetricLabels(stats, evaluations).filter(
    (label) => label !== excludeLabel
  );

  return ({ selectionStart, selectionEnd }) =>
    labels.map((label) => ({
      type: 'metric',
      text: label,
      start: selectionStart,
      end: selectionEnd,
    }));
};
