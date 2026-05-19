import type { TimeRange } from '@kbn/es-query';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { Refresh } from '../services/timefilter_refresh_service';
/**
 * Options interface for the `useTimefilter` custom hook.
 */
interface UseTimefilterOptions {
    /**
     * Boolean flag to enable/disable the time range selector
     */
    timeRangeSelector?: boolean;
    /**
     * Boolean flag to enable/disable the auto refresh selector
     */
    autoRefreshSelector?: boolean;
}
/**
 * Custom hook to get the timefilter from runtime dependencies.
 *
 * @param {UseTimefilterOptions} options - time filter options
 * @returns {TimefilterContract} timefilter
 */
export declare const useTimefilter: (options?: UseTimefilterOptions) => TimefilterContract;
/**
 * Custom hook to return refresh interval updates from the `refreshIntervalObservable$` observable.
 *
 * @returns refresh interval update
 */
export declare const useRefreshIntervalUpdates: () => Readonly<{} & {
    value: number;
    pause: boolean;
}>;
/**
 * Custom hook to return time range updates from the `timeChangeObservable$` observable.
 *
 * @param absolute - flag to enforce absolute times
 * @returns time range update
 */
export declare const useTimeRangeUpdates: (absolute?: boolean) => TimeRange;
/**
 * Provides the latest refresh, both manual or auto.
 */
export declare const useRefresh: () => Refresh | undefined;
export {};
