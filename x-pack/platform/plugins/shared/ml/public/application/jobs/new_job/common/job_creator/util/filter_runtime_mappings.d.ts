import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
interface Response {
    runtime_mappings: RuntimeMappings;
    discarded_mappings: RuntimeMappings;
}
export declare function filterRuntimeMappings(job: Job, datafeed: Datafeed): Response;
export {};
