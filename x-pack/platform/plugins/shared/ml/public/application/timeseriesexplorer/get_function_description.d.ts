import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import { type MlResultsService } from '../services/results_service';
import type { ToastNotificationService } from '../services/toast_notification_service';
import type { MlEntity } from '../../embeddables';
export declare function isMetricDetector(selectedJob: CombinedJob, selectedDetectorIndex: number): boolean;
/**
 * Get the function description from the record with the highest anomaly score
 */
export declare const getFunctionDescription: ({ selectedDetectorIndex, selectedEntities, selectedJob, }: {
    selectedDetectorIndex: number;
    selectedEntities: MlEntity | undefined;
    selectedJob: CombinedJob;
}, toastNotificationService: ToastNotificationService, mlResultsService: MlResultsService) => Promise<any>;
