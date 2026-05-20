import type { FC } from 'react';
import type { MlEntity, SingleMetricViewerEmbeddableApi } from '../../../embeddables/types';
export declare const EntityFieldNamesAndFilterButtons: FC<{
    api?: SingleMetricViewerEmbeddableApi;
    entityData: {
        entities: MlEntity[];
        count: number;
    };
}>;
interface SingleMetricViewerTitleProps {
    api?: SingleMetricViewerEmbeddableApi;
    entityData: {
        entities: MlEntity[];
        count: number;
    };
    functionLabel: string;
}
export declare const SingleMetricViewerTitle: FC<SingleMetricViewerTitleProps>;
export {};
