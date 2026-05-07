/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import {
  buildMetricStylingState,
  convertMetricStylingToAPIFormat,
} from '@kbn/lens-embeddable-utils';
import type { MetricConfig } from '@kbn/lens-embeddable-utils';
import type { VizStateAdapter } from './types';
import { flattenToDotPaths, unflattenFromDotPaths } from './dot_path_helpers';

export const metricStateAdapter: VizStateAdapter<MetricVisualizationState> = {
  stateToFormValues(state) {
    const apiFormat = convertMetricStylingToAPIFormat(state);
    return flattenToDotPaths(apiFormat);
  },

  formValuesToState(currentState, formValues) {
    const apiConfig = unflattenFromDotPaths(formValues) as MetricConfig;
    const hasSecondary = !!currentState.secondaryMetricAccessor;
    const stylingState = buildMetricStylingState(apiConfig, hasSecondary);
    return { ...currentState, ...stylingState };
  },
};
