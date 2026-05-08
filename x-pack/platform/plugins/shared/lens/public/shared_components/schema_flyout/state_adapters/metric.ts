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
    // Strip empty/undefined/null values so optional fields are removed from state
    const cleanedValues = Object.fromEntries(
      Object.entries(formValues).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    const apiConfig = unflattenFromDotPaths(cleanedValues) as MetricConfig;
    const hasSecondary = !!currentState.secondaryMetricAccessor;
    const stylingState = buildMetricStylingState(apiConfig, hasSecondary);

    // buildMetricStylingState uses stripUndefined(), so optional keys absent
    // from stylingState must be explicitly deleted from currentState to avoid
    // stale values surviving the spread (e.g. icon removal).
    const optionalKeys = ['icon', 'iconAlign'] as const;
    const merged = { ...currentState, ...stylingState };
    for (const key of optionalKeys) {
      if (!(key in stylingState)) {
        delete (merged as Record<string, unknown>)[key];
      }
    }
    return merged;
  },
};
