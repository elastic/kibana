import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { DatafeedValidationResponse } from '@kbn/ml-common-types/job_validation';
import type { MlClient } from '../../lib/ml_client';
import type { JobValidationMessage } from '../../../common/constants/messages';
export declare function validateDatafeedPreviewWithMessages(mlClient: MlClient, job: CombinedJob, start: number | undefined, end: number | undefined): Promise<JobValidationMessage[]>;
export declare function validateDatafeedPreview(mlClient: MlClient, job: CombinedJob, start: number | undefined, end: number | undefined): Promise<DatafeedValidationResponse>;
