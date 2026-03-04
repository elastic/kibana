/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedTimeRange } from '@kbn/presentation-publishing';
import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';

export interface LogRateAnalysisEmbeddableState extends SerializedTitles, SerializedTimeRange {
  dataViewId?: string;
}

export type StoredLogRateAnalysisEmbeddableState = Omit<
  LogRateAnalysisEmbeddableState,
  'dataViewId'
>;
