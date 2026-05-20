import type { IScopedClusterClient } from '@kbn/core/server';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { JobValidationMessage } from '../../../common/constants/messages';
export type Messages = JobValidationMessage[];
export declare function validateCardinality(client: IScopedClusterClient, job?: CombinedJob): Promise<Messages> | never;
