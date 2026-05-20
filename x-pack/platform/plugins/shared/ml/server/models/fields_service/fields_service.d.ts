import type { IScopedClusterClient } from '@kbn/core/server';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { Datafeed, IndicesOptions } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
/**
 * Service for carrying out queries to obtain data
 * specific to fields in Elasticsearch indices.
 */
export declare function fieldsServiceProvider({ asCurrentUser }: IScopedClusterClient): {
    getCardinalityOfFields: (index: string[] | string, fieldNames: string[], query: any, timeFieldName: string, earliestMs: number, latestMs: number, datafeedConfig?: Datafeed) => Promise<{
        [key: string]: number;
    }>;
    getTimeFieldRange: (index: string[] | string, timeFieldName: string, query: any, runtimeMappings?: RuntimeMappings, indicesOptions?: IndicesOptions, allowFutureTime?: boolean, projectRouting?: string) => Promise<{
        success: boolean;
        start: number;
        end: number;
    }>;
    getMaxBucketCardinalities: (index: string[] | string, fieldNames: string[], query: any, timeFieldName: string, earliestMs: number, latestMs: number, interval: string | undefined, datafeedConfig?: Datafeed) => Promise<{
        [key: string]: number;
    }>;
};
