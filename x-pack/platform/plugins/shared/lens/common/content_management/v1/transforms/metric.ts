/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '../../../../public';
import type { LensAttributes } from '../../../../server/content_management/v1';

/**
 * Pre-rename shape of `secondaryNameVisibility`. Real saved objects created between
 * `#261247` (which introduced this field as `'before' | 'after'`) and the rename to
 * `secondaryNameVisibility` still persist it under this legacy key.
 * @deprecated
 */
interface LegacyMetricVisualizationState {
  secondaryLabelPosition?: MetricVisualizationState['secondaryNameVisibility'];
}

/**
 * Cleanup metric properties
 * - Move `valuesTextAlign` to `primaryAlign` and `secondaryAlign`
 * - Drop `secondaryPrefix`/`secondaryLabel` in favour of the secondary metric operation name,
 *   preserving their visibility in `secondaryNameVisibility`
 * - Rename `secondaryLabelPosition` to `secondaryNameVisibility`
 */
export function metricMigrations(attributes: LensAttributes): LensAttributes {
  if (!attributes.state || attributes.visualizationType !== 'lnsMetric') {
    return attributes;
  }

  const state = attributes.state as {
    visualization: MetricVisualizationState;
  };
  const newVisualizationState = getUpdatedMetricState(state.visualization);

  return {
    ...attributes,
    state: {
      ...state,
      visualization: newVisualizationState,
    },
  };
}

export const getUpdatedMetricState = (
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

  if (newState.secondaryMetricAccessor) {
    // The legacy label had 3 modes: `undefined` (the operation name), `''` (no label) and any
    // other string (a custom label overriding the operation name). Only the visibility survives:
    // the label is now always the operation name, so custom text is dropped.
    const legacyLabel = secondaryLabel ?? secondaryPrefix;
    newState = {
      ...newState,
      secondaryNameVisibility:
        legacyLabel === ''
          ? 'hidden'
          : // A state without an explicit position predates `Name display`, where the label
            // was shown before the value by default. Newer states always set it explicitly.
            // `secondaryLabelPosition` is the pre-rename key: real saved objects created after
            // `#261247` but before the rename persist their explicit choice there.
            newState.secondaryNameVisibility ?? secondaryLabelPosition ?? 'before',
    };
  }

  return newState;
};
