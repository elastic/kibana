/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import { LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME } from '@kbn/aiops-log-rate-analysis/constants';
import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';
import { flow } from 'lodash';
import {
  type LegacyLogRateAnalysisFields,
  normalizeLogRateAnalysisLegacyFields,
} from './normalize_legacy_state';
import type { StoredLogRateAnalysisEmbeddableState } from './types';

export function transformOut(
  storedState: StoredLogRateAnalysisEmbeddableState,
  references?: Reference[]
): LogRateAnalysisEmbeddableState {
  const transformsFlow = flow(
    transformTitlesOut<StoredLogRateAnalysisEmbeddableState>,
    transformTimeRangeOut<StoredLogRateAnalysisEmbeddableState>
  );
  const state = transformsFlow(storedState) as StoredLogRateAnalysisEmbeddableState &
    LegacyLogRateAnalysisFields;

  const dataViewId =
    references?.find((ref) => ref.name === LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME)?.id ??
    normalizeLogRateAnalysisLegacyFields(state).data_view_id;

  if (!dataViewId) {
    throw new Error('Invalid log rate analysis embeddable state: missing data_view_id reference');
  }

  const { dataViewId: _dataViewId, ...passthrough } = state;

  return {
    ...passthrough,
    data_view_id: dataViewId,
  };
}
