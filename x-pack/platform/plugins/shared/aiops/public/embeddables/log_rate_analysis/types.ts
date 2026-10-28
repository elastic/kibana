/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  HasEditCapabilities,
  PublishesDataSources,
  PublishesTimeRange,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';

export interface LogRateAnalysisComponentApi {
  dataViewId: PublishingSubject<LogRateAnalysisEmbeddableState['data_view_id']>;
  updateUserInput: (update: Pick<LogRateAnalysisEmbeddableState, 'data_view_id'>) => void;
}

export type LogRateAnalysisEmbeddableApi = DefaultEmbeddableApi<LogRateAnalysisEmbeddableState> &
  HasEditCapabilities &
  PublishesDataSources<DataView> &
  PublishesTimeRange &
  LogRateAnalysisComponentApi;
