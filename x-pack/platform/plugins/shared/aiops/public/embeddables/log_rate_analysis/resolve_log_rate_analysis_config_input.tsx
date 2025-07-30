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
  deletePanel,
  initialState,
  onCancel,
  onConfirm,
}: {
  pluginStart: AiopsPluginStartDeps;
  isNewPanel: boolean;
  logRateAnalysisControlsApi: LogRateAnalysisComponentApi;
  deletePanel?: () => void;
  initialState?: LogRateAnalysisEmbeddableState;
  onCancel: () => void;
  onConfirm: (newUpdate: LogRateAnalysisEmbeddableState) => void;
}) {
  const hasChanged = React.useRef(false);
  // Detects if the flyout was closed via "X" (not Confirm or Cancel) to clean up the panel preview state
  const hasConfirmed = React.useRef(false);
  const hasCanceled = React.useRef(false);

  const cleanPreviewIfNotConfirmed = React.useCallback(() => {
    if (isNewPanel && deletePanel) {
      deletePanel();
      onCancel();
    } else if (hasChanged.current && logRateAnalysisControlsApi && initialState) {
      logRateAnalysisControlsApi.updateUserInput(initialState);
      onCancel();
    }
  }, [isNewPanel, deletePanel, onCancel, logRateAnalysisControlsApi, initialState]);

  React.useEffect(() => {
    return () => {
      if (hasConfirmed.current || hasCanceled.current) {
        return;
      }
      cleanPreviewIfNotConfirmed();
    };
  }, [cleanPreviewIfNotConfirmed]);

  const cancelChanges = () => {
    hasCanceled.current = true;
    cleanPreviewIfNotConfirmed();
  };

  const confirmChanges = (nextUpdate: LogRateAnalysisEmbeddableState) => {
    hasConfirmed.current = true;
    onConfirm(nextUpdate);
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
      onCreate={confirmChanges}
      onCancel={cancelChanges}
      onPreview={preview}
      isNewPanel={isNewPanel}
    />
  );
}
