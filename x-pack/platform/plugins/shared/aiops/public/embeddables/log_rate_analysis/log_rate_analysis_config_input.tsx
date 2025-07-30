/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AiopsPluginStartDeps } from '../../types';
import { LogRateAnalysisEmbeddableInitializer } from './log_rate_analysis_embeddable_initializer';
import type { LogRateAnalysisComponentApi, LogRateAnalysisEmbeddableState } from './types';

export function EmbeddableLogRateAnalysisUserInput({
  pluginStart,
  isNewPanel,
  logRateAnalysisControlsApi,
  onCancel,
  onConfirm,
  deletePanel,
  initialState,
}: {
  pluginStart: AiopsPluginStartDeps;
  isNewPanel: boolean;
  logRateAnalysisControlsApi: LogRateAnalysisComponentApi;
  onCancel: () => void;
  onConfirm: (newUpdate: LogRateAnalysisEmbeddableState) => void;
  deletePanel?: () => void;
  initialState?: LogRateAnalysisEmbeddableState;
}) {
  const hasChanged = React.useRef(false);

  const cancelChanges = () => {
    if (isNewPanel && deletePanel) {
      deletePanel();
      onCancel();
    } else if (hasChanged.current && logRateAnalysisControlsApi && initialState) {
      logRateAnalysisControlsApi.updateUserInput(initialState);
      onCancel();
    }
  };

  const preview = async (nextUpdate: LogRateAnalysisEmbeddableState) => {
    if (logRateAnalysisControlsApi) {
      logRateAnalysisControlsApi.updateUserInput(nextUpdate);
      hasChanged.current = true;
    }
  };

  return (
    <LogRateAnalysisEmbeddableInitializer
      dataViews={pluginStart.data.dataViews}
      IndexPatternSelect={pluginStart.unifiedSearch.ui.IndexPatternSelect}
      initialInput={initialState}
      onCreate={onConfirm}
      onCancel={cancelChanges}
      onPreview={preview}
      isNewPanel={isNewPanel}
    />
  );
}
