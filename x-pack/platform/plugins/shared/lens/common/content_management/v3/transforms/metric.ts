/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '../../../../public';
import type { LensAttributes } from '../../../../server/content_management/v3/types';

/**
 * Cleanup metric properties
 * - Remove `titleWeight` (font weight is no longer configurable)
 */
export function metricMigrations(attributes: LensAttributes): LensAttributes {
  if (!attributes.state || attributes.visualizationType !== 'lnsMetric') {
    return attributes;
  }

  const state = attributes.state as {
    visualization: MetricVisualizationState & { titleWeight?: unknown };
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
  state: MetricVisualizationState & { titleWeight?: unknown }
): MetricVisualizationState => {
  const { titleWeight: _titleWeight, ...newState } = state;

  return newState;
};
