import { type TimefilterContract } from '@kbn/data-plugin/public';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { SingleMetricViewerEmbeddableUserInput } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
import { BehaviorSubject } from 'rxjs';
import type { SingleMetricViewerEmbeddableApi } from '../types';
interface SingleMetricViewerData {
    /**
     * Config data inputted by the user
     */
    singleMetricViewerData: SingleMetricViewerEmbeddableUserInput | undefined;
    /**
     * Current time range bounds
     */
    bounds: TimeRangeBounds | undefined;
    /**
     * Time of last refresh in ms
     */
    lastRefresh: number | undefined;
}
export declare const initializeSingleMetricViewerDataFetcher: (api: SingleMetricViewerEmbeddableApi, timefilter: TimefilterContract) => {
    singleMetricViewerData$: BehaviorSubject<SingleMetricViewerData>;
    onDestroy: () => void;
};
export {};
