import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
export declare const isManagedJob: (job: MlSummaryJob | MlJob) => boolean;
