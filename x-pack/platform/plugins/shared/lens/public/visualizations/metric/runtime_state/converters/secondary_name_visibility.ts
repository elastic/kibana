/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';

/**
 * Pre-rename shape of `secondaryNameVisibility`. Real saved objects created between
 * `#261247` (which introduced this field as `'before' | 'after'`) and the rename to
 * `secondaryNameVisibility` still persist it under this legacy key.
 */
interface LegacyMetricVisualizationState {
  secondaryLabelPosition?: MetricVisualizationState['secondaryNameVisibility'];
}

/**
 * Runtime conversion for metric Name display.
 *
 * - Move `valuesTextAlign` to `primaryAlign` and `secondaryAlign`
 * - Map `secondaryPrefix` / `secondaryLabel` / `secondaryLabelPosition` onto
 *   `secondaryNameVisibility`
 * - Keep a non-empty `secondaryLabel` as a render fallback until a future CM
 *   version copies it onto the secondary column and deletes the field
 */

/**
 * This converter:
 * - maps `secondaryLabelPosition` → `secondaryNameVisibility`
 * - treats `''` as **hidden**
 * - keeps a non-empty `secondaryLabel` / `secondaryPrefix` as a **render fallback**
 * - defaults old charts with no position to **before**
 */
export const convertSecondaryNameVisibility = (
  state: MetricVisualizationState
): MetricVisualizationState => {
  const legacyState = state as MetricVisualizationState & LegacyMetricVisualizationState;
  const { secondaryPrefix, secondaryLabel, secondaryLabelPosition, valuesTextAlign, ...restState } =
    legacyState;
  let newState: MetricVisualizationState = { ...restState };

  if (valuesTextAlign) {
    newState = {
      ...newState,
      primaryAlign: state.primaryAlign ?? valuesTextAlign,
      secondaryAlign: state.secondaryAlign ?? valuesTextAlign,
    };
  }

  if (!newState.secondaryMetricAccessor) {
    return newState;
  }

  const legacyLabel = secondaryLabel ?? secondaryPrefix;
  newState = {
    ...newState,
    ...(legacyLabel ? { secondaryLabel: legacyLabel } : {}),
    secondaryNameVisibility:
      legacyLabel === ''
        ? 'hidden'
        : newState.secondaryNameVisibility ?? secondaryLabelPosition ?? 'before',
  };

  return newState;
};
