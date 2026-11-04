/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';

/**
 * Resolves the metric Name display setting from the legacy secondary label state.
 *
 * - `secondaryLabelPosition` is the pre-rename key for `secondaryNameVisibility`, still
 *   persisted by saved objects created after #261247
 * - an empty `secondaryLabel` is the legacy `None` choice, which now means hidden
 * - a non-empty `secondaryLabel` is kept as a render fallback: its replacement is the
 *   secondary column's custom label, which this converter cannot write, so the text has
 *   to survive until a content management version copies it onto the column
 */
export const convertSecondaryNameVisibility = (
  state: MetricVisualizationState
): MetricVisualizationState => {
  const { secondaryLabel, secondaryLabelPosition, ...restState } = state;
  let newState: MetricVisualizationState = { ...restState };

  if (!newState.secondaryMetricAccessor) {
    return newState;
  }

  newState = {
    ...newState,
    ...(secondaryLabel ? { secondaryLabel } : {}),
    secondaryNameVisibility:
      secondaryLabel === ''
        ? 'hidden'
        : newState.secondaryNameVisibility ?? secondaryLabelPosition ?? 'before',
  };

  return newState;
};
