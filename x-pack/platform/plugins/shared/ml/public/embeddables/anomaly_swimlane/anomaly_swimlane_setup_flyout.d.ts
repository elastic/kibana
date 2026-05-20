import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import type { AnomalySwimLaneEmbeddableState, AnomalySwimlaneEmbeddableUserInput } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type { MlDependencies } from '../../application/app';
import type { MlStartDependencies } from '../../plugin';
export declare function AnomalySwimlaneUserInput({ coreStart, pluginStart, onConfirm, onCancel, input, }: {
    coreStart: CoreStart;
    pluginStart: MlDependencies | MlStartDependencies;
    onConfirm: (state: AnomalySwimlaneEmbeddableUserInput) => void;
    onCancel: () => void;
    input?: Partial<AnomalySwimLaneEmbeddableState>;
}): React.JSX.Element;
