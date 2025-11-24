/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME } from '@kbn/aiops-log-rate-analysis/constants';
import type { StoredLogRateAnalysisEmbeddableState } from './types';

export function transformOut(
  state: StoredLogRateAnalysisEmbeddableState,
  references?: Reference[]
) {
  const dataViewIdRef = references?.find(
    (ref) => ref.name === LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME
  );
  return {
    ...state,
    ...(dataViewIdRef && { dataViewId: dataViewIdRef.id }),
  };
}
