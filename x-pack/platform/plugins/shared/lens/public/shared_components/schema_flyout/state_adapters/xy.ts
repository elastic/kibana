/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYVisualizationState } from '@kbn/lens-common';
import {
  convertXYLegendToAPIFormat,
  convertXYLegendToStateFormat,
  convertXYStylingToAPIFormat,
  convertXYStylingToStateFormat,
} from '@kbn/lens-embeddable-utils';
import type { XYConfig } from '@kbn/lens-embeddable-utils/config_builder/schema';
import type { VizStateAdapter } from './types';
import { flattenToDotPaths, unflattenFromDotPaths } from './dot_path_helpers';

// Default layer presence — expose all styling sections
const ALL_LAYERS = { hasBars: true, hasLines: true, hasAreas: true };

export const xyStateAdapter: VizStateAdapter<XYVisualizationState> = {
  stateToFormValues(state) {
    const legendApi = convertXYLegendToAPIFormat(state.legend);
    const stylingApi = convertXYStylingToAPIFormat(state, ALL_LAYERS);
    return flattenToDotPaths({ ...legendApi, styling: stylingApi });
  },

  formValuesToState(currentState, formValues) {
    const apiConfig = unflattenFromDotPaths(formValues) as XYConfig;
    const legendState = apiConfig.legend ? convertXYLegendToStateFormat(apiConfig.legend) : {};
    const stylingState = apiConfig.styling ? convertXYStylingToStateFormat(apiConfig.styling) : {};
    return { ...currentState, ...legendState, ...stylingState };
  },
};
