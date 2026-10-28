/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';

const LEGACY_METRIC_DENSITY = 'compact';

/**
 * Normalizes legacy saved states where `density` was not yet persisted.
 *
 * The previous metric chart layout maps to the new "compact" density option, so
 * old saved objects must get it explicitly before rendering.
 */
export const convertDensity = (state: MetricVisualizationState): MetricVisualizationState => {
  if (state.density === undefined) {
    return { ...state, density: LEGACY_METRIC_DENSITY };
  }
  return state;
};
