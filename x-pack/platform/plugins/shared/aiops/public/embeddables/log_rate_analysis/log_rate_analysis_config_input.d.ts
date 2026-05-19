import React from 'react';
import type { AiopsPluginStartDeps } from '../../types';
import type { LogRateAnalysisComponentApi } from './types';
import type { LogRateAnalysisEmbeddableState } from '../../../common/embeddables/log_rate_analysis/types';
export declare function EmbeddableLogRateAnalysisUserInput({ pluginStart, logRateAnalysisControlsApi, onCancel, onConfirm, initialState, isNewPanel, }: {
    pluginStart: AiopsPluginStartDeps;
    logRateAnalysisControlsApi: LogRateAnalysisComponentApi;
    onCancel: () => void;
    onConfirm: (newUpdate: LogRateAnalysisEmbeddableState) => void;
    initialState?: LogRateAnalysisEmbeddableState;
    isNewPanel?: boolean;
}): React.JSX.Element;
