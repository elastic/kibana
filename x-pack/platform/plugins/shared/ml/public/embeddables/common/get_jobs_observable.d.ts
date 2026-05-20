import type { Observable } from 'rxjs';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { ExplorerJob } from '../../application/explorer/explorer_utils';
import type { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
export declare function getJobsObservable(jobIds$: Observable<JobId[]>, anomalyDetectorService: AnomalyDetectorService, setErrorHandler: (e: Error) => void): Observable<ExplorerJob[]>;
