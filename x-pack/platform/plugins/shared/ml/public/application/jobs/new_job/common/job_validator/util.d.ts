import type { estypes } from '@elastic/elasticsearch';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { BasicValidations } from './job_validator';
import type { ValidationResults } from '../../../../../../common/util/job_utils';
export declare function populateValidationMessages(validationResults: ValidationResults, basicValidations: BasicValidations, jobConfig: Job, datafeedConfig: Datafeed): void;
export declare function invalidTimeIntervalMessage(value: estypes.Duration | undefined): string;
