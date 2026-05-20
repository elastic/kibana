import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AiopsPluginStartDeps } from '../../types';
import type { ChangePointEmbeddableState } from '../../../common/embeddables/change_point_chart/types';
export declare function EmbeddableChangePointUserInput({ coreStart, pluginStart, onConfirm, onCancel, input, }: {
    coreStart: CoreStart;
    pluginStart: AiopsPluginStartDeps;
    onConfirm: (state: ChangePointEmbeddableState) => void;
    onCancel: () => void;
    input?: ChangePointEmbeddableState;
}): React.JSX.Element;
