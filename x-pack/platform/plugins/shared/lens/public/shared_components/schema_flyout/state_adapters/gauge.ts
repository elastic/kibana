/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GaugeVisualizationState } from '@kbn/lens-common';
import { buildGaugeStylingState, convertGaugeStylingToAPIFormat } from '@kbn/lens-embeddable-utils';
import type { GaugeConfig } from '@kbn/lens-embeddable-utils';
import type { VizStateAdapter } from './types';
import { flattenToDotPaths, unflattenFromDotPaths } from './dot_path_helpers';

export const gaugeStateAdapter: VizStateAdapter<GaugeVisualizationState> = {
  stateToFormValues(state) {
    const apiFormat = convertGaugeStylingToAPIFormat(state);
    return flattenToDotPaths(apiFormat);
  },

  formValuesToState(currentState, formValues) {
    const apiConfig = unflattenFromDotPaths(formValues) as GaugeConfig;
    const stylingState = buildGaugeStylingState(apiConfig);
    return { ...currentState, ...stylingState };
  },
};
