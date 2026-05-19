import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { DatafeedStats } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed_stats';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { JobStats } from '@kbn/ml-common-types/anomaly_detection_jobs/job_stats';
import type { GetGuards } from '../shared_services';
export interface AnomalyDetectorsProvider {
    anomalyDetectorsProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract): {
        jobs(jobId?: string): Promise<{
            count: number;
            jobs: Job[];
        }>;
        jobStats(jobId?: string): Promise<{
            count: number;
            jobs: JobStats[];
        }>;
        datafeeds(datafeedId?: string): Promise<{
            count: number;
            datafeeds: Datafeed[];
        }>;
        datafeedStats(datafeedId?: string): Promise<{
            count: number;
            datafeeds: DatafeedStats[];
        }>;
    };
}
export declare function getAnomalyDetectorsProvider(getGuards: GetGuards): AnomalyDetectorsProvider;
