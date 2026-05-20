import type { FC } from 'react';
import type { SingleMetricViewerEmbeddableInput, SingleMetricViewerEmbeddableUserInput } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { MlApi } from '../../application/services/ml_api_service';
export interface SingleMetricViewerInitializerProps {
    bounds: TimeRangeBounds;
    initialInput?: Partial<SingleMetricViewerEmbeddableInput>;
    mlApi: MlApi;
    onCreate: (props: SingleMetricViewerEmbeddableUserInput) => void;
    onCancel: () => void;
}
export declare const SingleMetricViewerInitializer: FC<SingleMetricViewerInitializerProps>;
