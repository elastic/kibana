/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AiopsPluginStartDeps } from '../../types';
import { LogRateAnalysisEmbeddableInitializer } from './log_rate_analysis_embeddable_initializer';
import type { LogRateAnalysisComponentApi } from './types';
import type { LogRateAnalysisEmbeddableState } from '../../../common/embeddables/log_rate_analysis/types';

export function EmbeddableLogRateAnalysisUserInput({
  pluginStart,
  logRateAnalysisControlsApi,
  onCancel,
  onConfirm,
  initialState,
  isNewPanel,
}: {
  pluginStart: AiopsPluginStartDeps;
  logRateAnalysisControlsApi: LogRateAnalysisComponentApi;
  onCancel: () => void;
  onConfirm: (newUpdate: LogRateAnalysisEmbeddableState) => void;
  initialState?: LogRateAnalysisEmbeddableState;
  isNewPanel?: boolean;
}) {
  const handlePreview = async (nextUpdate: LogRateAnalysisEmbeddableState) => {
    if (logRateAnalysisControlsApi) {
      logRateAnalysisControlsApi.updateUserInput(nextUpdate);
    }
  };

  return (
    <LogRateAnalysisEmbeddableInitializer
      dataViews={pluginStart.data.dataViews}
      IndexPatternSelect={pluginStart.unifiedSearch.ui.IndexPatternSelect}
      initialInput={initialState}
      onCreate={onConfirm}
      onCancel={onCancel}
      onPreview={handlePreview}
      isNewPanel={Boolean(isNewPanel)}
    />
  );
}
