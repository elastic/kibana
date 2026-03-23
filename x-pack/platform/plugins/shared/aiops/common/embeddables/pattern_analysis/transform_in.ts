/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { Reference } from '@kbn/content-management-utils';
import { PATTERN_ANALYSIS_DATA_VIEW_REF_NAME } from '@kbn/aiops-log-pattern-analysis/constants';
import type { PatternAnalysisEmbeddableState, StoredPatternAnalysisEmbeddableState } from './types';

export function transformIn(state: PatternAnalysisEmbeddableState): {
  state: StoredPatternAnalysisEmbeddableState;
  references: Reference[];
} {
  const { dataViewId, ...rest } = state;
  return {
    state: rest,
    references: dataViewId
      ? [
          {
            type: DATA_VIEW_SAVED_OBJECT_TYPE,
            name: PATTERN_ANALYSIS_DATA_VIEW_REF_NAME,
            id: dataViewId,
          },
        ]
      : [],
  };
}
