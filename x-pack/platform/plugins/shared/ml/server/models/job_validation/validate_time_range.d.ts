import type { IScopedClusterClient } from '@kbn/core/server';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
interface ValidateTimeRangeMessage {
    id: string;
    timeField?: string;
    minTimeSpanReadable?: string;
    bucketSpanCompareFactor?: number;
}
interface TimeRange {
    start: number;
    end: number;
}
export declare function isValidTimeField({ asCurrentUser }: IScopedClusterClient, job: CombinedJob): Promise<boolean>;
export declare function validateTimeRange(mlClientCluster: IScopedClusterClient, job: CombinedJob, timeRange?: Partial<TimeRange>): Promise<ValidateTimeRangeMessage[]>;
export {};
