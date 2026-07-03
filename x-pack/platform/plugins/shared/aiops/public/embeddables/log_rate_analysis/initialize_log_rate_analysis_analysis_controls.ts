/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';
import type { LogRateAnalysisComponentApi } from './types';

export const initializeLogRateAnalysisControls = (initialState: LogRateAnalysisEmbeddableState) => {
  const dataViewId = new BehaviorSubject<string>(initialState.data_view_id);

  const updateUserInput = (update: Pick<LogRateAnalysisEmbeddableState, 'data_view_id'>) => {
    dataViewId.next(update.data_view_id);
  };

  const serializeLogRateAnalysisChartState = (): Pick<
    LogRateAnalysisEmbeddableState,
    'data_view_id'
  > => {
    return {
      data_view_id: dataViewId.getValue(),
    };
  };

  return {
    logRateAnalysisControlsApi: {
      dataViewId,
      updateUserInput,
    } as LogRateAnalysisComponentApi,
    serializeLogRateAnalysisChartState,
  };
};
