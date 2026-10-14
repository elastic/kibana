/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';

// Pre-9.5 stored state used camelCase for these fields.
export interface LegacyLogRateAnalysisFields {
  dataViewId?: string;
}

export type RawLogRateAnalysisState = Partial<LogRateAnalysisEmbeddableState> &
  LegacyLogRateAnalysisFields;

interface NormalizedLogRateAnalysisFields {
  data_view_id: string | undefined;
}

export const normalizeLogRateAnalysisLegacyFields = (
  state: RawLogRateAnalysisState
): NormalizedLogRateAnalysisFields => ({
  data_view_id: state.data_view_id ?? state.dataViewId,
});
