import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AnomalyChartsEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { MlStartDependencies } from '../../plugin';
export declare function EmbeddableAnomalyChartsUserInput({ coreStart, pluginStart, onConfirm, onCancel, input, }: {
    coreStart: CoreStart;
    pluginStart: MlStartDependencies;
    onConfirm: (state: AnomalyChartsEmbeddableState) => void;
    onCancel: () => void;
    input?: AnomalyChartsEmbeddableState;
}): React.JSX.Element;
