/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '../../../../public';
import type { LensAttributes } from '../../../../server/content_management/v1';

/**
 * Cleanup metric properties
 * - Move `valuesTextAlign` to `primaryAlign` and `secondaryAlign`
 * - Drop `secondaryPrefix`/`secondaryLabel` in favour of the secondary metric operation name,
 *   preserving their visibility in `secondaryLabelPosition`
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
  const { secondaryPrefix, secondaryLabel, valuesTextAlign, ...restState } = state;
  let newState = { ...restState };

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
      secondaryLabelPosition:
        legacyLabel === ''
          ? 'hidden'
          : // A state without an explicit position predates `Name visibility`, where the label
            // was shown before the value by default. Newer states always set it explicitly.
            newState.secondaryLabelPosition ?? 'before',
    };
  }

  return newState;
};
