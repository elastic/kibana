import type { ToastsStart } from '@kbn/core/public';
import type { MlJobWithTimeRange } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { MlJobService } from '../../services/job_service';
import type { GetJobSelection } from '../../contexts/ml/use_job_selection_flyout';
/**
 * FIXME validator should not have any side effects like the global state update
 * returns true/false if setGlobalState has been triggered
 * or returns the job id which should be loaded.
 */
export declare function validateJobSelection(jobsWithTimeRange: MlJobWithTimeRange[], selectedJobIds: string[], setGlobalState: (...args: any) => void, mlJobService: MlJobService, toastNotifications: ToastsStart, getJobSelection: GetJobSelection): boolean | string;
