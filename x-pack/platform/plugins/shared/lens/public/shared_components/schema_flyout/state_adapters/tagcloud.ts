/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensTagCloudState } from '@kbn/lens-common';
import {
  buildTagcloudStylingState,
  convertTagcloudStylingToAPIFormat,
} from '@kbn/lens-embeddable-utils';
import type { TagcloudConfig } from '@kbn/lens-embeddable-utils';
import type { VizStateAdapter } from './types';
import { flattenToDotPaths, unflattenFromDotPaths } from './dot_path_helpers';

export const tagcloudStateAdapter: VizStateAdapter<LensTagCloudState> = {
  stateToFormValues(state) {
    const apiFormat = convertTagcloudStylingToAPIFormat(state);
    return flattenToDotPaths(apiFormat);
  },

  formValuesToState(currentState, formValues) {
    const apiConfig = unflattenFromDotPaths(formValues) as TagcloudConfig;
    const stylingState = buildTagcloudStylingState(apiConfig);
    return { ...currentState, ...stylingState };
  },
};
