/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableVisualizationState } from '@kbn/lens-common';
import {
  buildDatatableStylingState,
  convertDatatableStylingToAPIFormat,
} from '@kbn/lens-embeddable-utils';
import type { DatatableConfig } from '@kbn/lens-embeddable-utils';
import type { VizStateAdapter } from './types';
import { flattenToDotPaths, unflattenFromDotPaths } from './dot_path_helpers';

export const datatableStateAdapter: VizStateAdapter<DatatableVisualizationState> = {
  stateToFormValues(state) {
    const apiFormat = convertDatatableStylingToAPIFormat(state, new Map());
    return flattenToDotPaths(apiFormat);
  },

  formValuesToState(currentState, formValues) {
    const apiConfig = unflattenFromDotPaths(formValues) as DatatableConfig;
    const stylingState = buildDatatableStylingState(apiConfig);
    return { ...currentState, ...stylingState };
  },
};
