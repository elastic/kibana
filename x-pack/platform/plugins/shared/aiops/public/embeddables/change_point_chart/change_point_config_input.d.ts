import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import type { AiopsPluginStartDeps } from '../../types';
export declare function EmbeddableChangePointUserInput({ coreStart, pluginStart, onConfirm, onCancel, input, }: {
    coreStart: CoreStart;
    pluginStart: AiopsPluginStartDeps;
    onConfirm: (state: ChangePointChartEmbeddableState) => void;
    onCancel: () => void;
    input?: ChangePointChartEmbeddableState;
}): React.JSX.Element;
