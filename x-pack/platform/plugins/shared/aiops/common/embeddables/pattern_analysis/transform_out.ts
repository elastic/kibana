/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import { PATTERN_ANALYSIS_DATA_VIEW_REF_NAME } from '@kbn/aiops-log-pattern-analysis/constants';
import { flow } from 'lodash';
import type { PatternAnalysisEmbeddableState, StoredPatternAnalysisEmbeddableState } from './types';

export function transformOut(
  storedState: StoredPatternAnalysisEmbeddableState,
  references?: Reference[]
): PatternAnalysisEmbeddableState {
  const transformsFlow = flow(
    transformTitlesOut<StoredPatternAnalysisEmbeddableState>,
    transformTimeRangeOut<StoredPatternAnalysisEmbeddableState>
  );
  const state = transformsFlow(storedState);
  const dataViewIdRef = references?.find((ref) => ref.name === PATTERN_ANALYSIS_DATA_VIEW_REF_NAME);
  return {
    ...state,
    ...(dataViewIdRef && { dataViewId: dataViewIdRef.id }),
  };
}
