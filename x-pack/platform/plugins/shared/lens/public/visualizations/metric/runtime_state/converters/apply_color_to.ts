/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import { LENS_METRIC_STATE_DEFAULTS } from '@kbn/lens-common';

/**
 * Normalizes legacy saved states where `applyColorTo` was not yet persisted.
 *
 * Old saved objects may have `color` or `palette` set without an explicit
 * `applyColorTo` value. In that case the previous implicit behavior was
 * "background", so we make it explicit here.
 */
export const convertApplyColorTo = (state: MetricVisualizationState): MetricVisualizationState => {
  if (state.applyColorTo === undefined && (state.color || state.palette)) {
    return { ...state, applyColorTo: LENS_METRIC_STATE_DEFAULTS.applyColorTo };
  }
  return state;
};
