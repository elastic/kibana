import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SingleMetricViewerEmbeddableInput, SingleMetricViewerEmbeddableUserInput } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
import type { MlApi } from '../../application/services/ml_api_service';
export declare function EmbeddableSingleMetricViewerUserInput({ coreStart, services, mlApi, onConfirm, onCancel, input, }: {
    coreStart: CoreStart;
    services: {
        data: DataPublicPluginStart;
        share?: SharePluginStart;
    };
    mlApi: MlApi;
    onConfirm: (state: SingleMetricViewerEmbeddableUserInput) => void;
    onCancel: () => void;
    input?: Partial<SingleMetricViewerEmbeddableInput>;
}): React.JSX.Element;
