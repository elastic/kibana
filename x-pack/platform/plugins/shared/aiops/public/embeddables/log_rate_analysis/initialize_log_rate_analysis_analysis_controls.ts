/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { LogRateAnalysisComponentApi } from './types';
import type { LogRateAnalysisEmbeddableState } from '../../../common/embeddables/log_rate_analysis/types';

export const initializeLogRateAnalysisControls = (initialState: LogRateAnalysisEmbeddableState) => {
  const dataViewId = new BehaviorSubject(initialState.dataViewId);

  const updateUserInput = (update: Pick<LogRateAnalysisEmbeddableState, 'dataViewId'>) => {
    dataViewId.next(update.dataViewId);
  };

  const serializeLogRateAnalysisChartState = (): Pick<
    LogRateAnalysisEmbeddableState,
    'dataViewId'
  > => {
    return {
      dataViewId: dataViewId.getValue(),
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
