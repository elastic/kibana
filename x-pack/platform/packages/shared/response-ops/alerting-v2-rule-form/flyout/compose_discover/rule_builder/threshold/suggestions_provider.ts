/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionsProvider } from '../shared/suggestions/types';
import { createLabelSuggestionsProvider } from '../shared/suggestions/create_label_suggestions_provider';
import type { EvaluationDefinition, StatDefinition } from './form_types';
import { getAvailableMetricLabels } from './form_types';

/**
 * Builds a suggestions provider offering the metric labels (stats + other evaluations)
 * available to reference from an evaluation expression, excluding the evaluation's own label
 * to avoid self-reference. Token filtering, prefix matching and selection handling are generic
 * and live in `createLabelSuggestionsProvider`.
 */
export const createMetricSuggestionsProvider = (
  stats: StatDefinition[],
  evaluations: EvaluationDefinition[],
  excludeLabel?: string
): SuggestionsProvider => {
  const labels = getAvailableMetricLabels(stats, evaluations).filter(
    (label) => label !== excludeLabel
  );

  return createLabelSuggestionsProvider(labels, 'metric');
};
