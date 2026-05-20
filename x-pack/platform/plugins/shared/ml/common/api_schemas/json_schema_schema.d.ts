import { type TypeOf } from '@kbn/config-schema';
export declare const getJsonSchemaQuerySchema: import("@kbn/config-schema").ObjectType<{
    /**
     * ES API path
     */
    path: import("@kbn/config-schema").Type<"/_ml/anomaly_detectors/{job_id}" | "/_ml/datafeeds/{datafeed_id}">;
    /**
     * API Method
     */
    method: import("@kbn/config-schema").Type<string>;
}>;
export type SupportedPath = TypeOf<typeof getJsonSchemaQuerySchema>['path'];
