import type { estypes } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { HttpStart } from '@kbn/core/public';
import type { GetTimeFieldRangeResponse } from './types';
/**
 * Options definition for the `getTimeFieldRange` function.
 */
interface GetTimeFieldRangeOptions {
    /**
     * The index to be queried.
     */
    index: string;
    /**
     * Optional time field name.
     */
    timeFieldName?: string;
    /**
     * Optional DSL query.
     */
    query?: QueryDslQueryContainer;
    /**
     * Optional runtime mappings.
     */
    runtimeMappings?: estypes.MappingRuntimeFields;
    /**
     * HTTP client
     */
    http: HttpStart;
    /**
     * API path ('/internal/file_upload/time_field_range')
     */
    path: string;
    signal?: AbortSignal;
    /**
     * Project routing
     */
    projectRouting?: string;
}
/**
 *
 * @param options - GetTimeFieldRangeOptions
 * @returns GetTimeFieldRangeResponse
 */
export declare function getTimeFieldRange(options: GetTimeFieldRangeOptions): Promise<GetTimeFieldRangeResponse>;
export {};
