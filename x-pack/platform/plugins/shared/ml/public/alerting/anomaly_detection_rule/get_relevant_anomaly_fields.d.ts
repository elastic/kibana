import type { MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
/**
 * Get relevant fields for filtering anomalies based on job configuration and result type.
 * These fields will be used to restrict autocomplete suggestions in the KQL filter.
 */
export declare function getRelevantAnomalyFields(jobConfigs: CombinedJobWithStats[], resultType: MlAnomalyResultType): string[];
