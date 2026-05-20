import type { Observable } from 'rxjs';
import type { Job, JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { HttpService } from './http_service';
export declare class AnomalyDetectorService {
    private mlApi;
    constructor(httpService: HttpService);
    /**
     * Fetches a single job object
     * @param jobId
     */
    getJobById$(jobId: JobId): Observable<Job>;
    /**
     * Fetches anomaly detection jobs by ids
     * @param jobIds
     */
    getJobs$(jobIds: JobId[]): Observable<Job[]>;
}
