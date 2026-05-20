import type { FC } from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { MlDependencies } from '../../application/app';
import type { SingleMetricViewerServices, MlEntity, SingleMetricViewerEmbeddableApi } from '../../embeddables/types';
export type SingleMetricViewerSharedComponent = FC<SingleMetricViewerProps>;
/**
 * Only used to initialize internally
 */
export type SingleMetricViewerPropsWithDeps = SingleMetricViewerProps & {
    api?: SingleMetricViewerEmbeddableApi;
    coreStart: CoreStart;
    pluginStart: MlDependencies;
    mlServices: SingleMetricViewerServices;
};
export interface SingleMetricViewerProps {
    shouldShowForecastButton?: boolean;
    bounds?: TimeRangeBounds;
    forecastId?: string;
    selectedEntities?: MlEntity;
    selectedDetectorIndex?: number;
    functionDescription?: string;
    selectedJobId: string | undefined;
    /**
     * Last reload request time, can be used for manual reload
     */
    lastRefresh?: number;
    onRenderComplete?: () => void;
    onError?: (error?: Error) => void;
    onForecastIdChange?: (forecastId: string | undefined) => void;
    uuid: string;
}
declare const SingleMetricViewerWrapper: FC<SingleMetricViewerPropsWithDeps>;
export default SingleMetricViewerWrapper;
