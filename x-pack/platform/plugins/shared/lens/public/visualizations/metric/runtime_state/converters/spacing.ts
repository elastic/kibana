/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';

const LEGACY_METRIC_SPACING = 'small';

/**
 * Normalizes legacy saved states where `spacing` was not yet persisted.
 *
 * The previous metric chart layout maps to the new "small" spacing option, so
 * old saved objects must get it explicitly before rendering.
 */
export const convertSpacing = (state: MetricVisualizationState): MetricVisualizationState => {
  if (state.spacing === undefined) {
    return { ...state, spacing: LEGACY_METRIC_SPACING };
  }
  return state;
};
