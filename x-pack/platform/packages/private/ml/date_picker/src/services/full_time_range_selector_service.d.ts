import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ToastsStart, HttpStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { GetTimeFieldRangeResponse } from './types';
/**
 * Allowed API paths to be passed to `setFullTimeRange`.
 */
export type SetFullTimeRangeApiPath = '/internal/file_upload/time_field_range' | '/internal/ml/fields_service/time_field_range';
/**
 * Determines the full available time range of the given Data View and updates
 * the timefilter accordingly.
 *
 * @param timefilter - TimefilterContract
 * @param dataView - DataView
 * @param toasts - ToastsStart
 * @param http - HttpStart
 * @param query - optional query
 * @param excludeFrozenData - optional boolean flag
 * @param path - optional SetFullTimeRangeApiPath
 * @returns {GetTimeFieldRangeResponse}
 */
export declare function setFullTimeRange(timefilter: TimefilterContract, dataView: DataView, toasts: ToastsStart, http: HttpStart, query?: QueryDslQueryContainer, excludeFrozenData?: boolean, path?: SetFullTimeRangeApiPath, projectRouting?: string): Promise<GetTimeFieldRangeResponse | undefined>;
/**
 * Return type for the `getTimeFilterRange` function.
 */
export interface TimeRange {
    /**
     * From timestamp.
     */
    from: number;
    /**
     * To timestamp.
     */
    to: number;
}
/**
 * Function to get the time filter range as timestamps.
 *
 * @param timefilter - The timefilter
 * @returns TimeRange
 */
export declare function getTimeFilterRange(timefilter: TimefilterContract): TimeRange;
