/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { PATTERN_ANALYSIS_DATA_VIEW_REF_NAME } from '@kbn/aiops-log-pattern-analysis/constants';
import type { PatternAnalysisEmbeddableState, StoredPatternAnalysisEmbeddableState } from './types';

export function transformOut(
  state: StoredPatternAnalysisEmbeddableState,
  references?: Reference[]
): PatternAnalysisEmbeddableState {
  const dataViewIdRef = references?.find((ref) => ref.name === PATTERN_ANALYSIS_DATA_VIEW_REF_NAME);
  return {
    ...state,
    ...(dataViewIdRef && { dataViewId: dataViewIdRef.id }),
  };
}
