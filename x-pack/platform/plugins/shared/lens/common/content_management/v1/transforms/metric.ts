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
 * - Move `secondaryPrefix` to `secondaryLabel`
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
  const { secondaryPrefix, valuesTextAlign, ...restState } = state;
  let newState = { ...restState };

  if (valuesTextAlign) {
    newState = {
      ...newState,
      primaryAlign: state.primaryAlign ?? valuesTextAlign,
      secondaryAlign: state.secondaryAlign ?? valuesTextAlign,
    };
  }

  if (secondaryPrefix && !newState.secondaryLabel) {
    newState = {
      ...newState,
      secondaryLabel: secondaryPrefix,
    };
  }

  return newState;
};
