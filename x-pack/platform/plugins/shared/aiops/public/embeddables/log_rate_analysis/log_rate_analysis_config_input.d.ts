import React from 'react';
import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';
import type { AiopsPluginStartDeps } from '../../types';
import type { LogRateAnalysisComponentApi } from './types';
export declare function EmbeddableLogRateAnalysisUserInput({ pluginStart, logRateAnalysisControlsApi, onCancel, onConfirm, initialState, isNewPanel, }: {
    pluginStart: AiopsPluginStartDeps;
    logRateAnalysisControlsApi: LogRateAnalysisComponentApi;
    onCancel: () => void;
    onConfirm: (newUpdate: LogRateAnalysisEmbeddableState) => void;
    initialState?: Pick<LogRateAnalysisEmbeddableState, 'data_view_id'>;
    isNewPanel?: boolean;
}): React.JSX.Element;
