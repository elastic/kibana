import type { FC } from 'react';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
interface Props {
    job: CombinedJobWithStats;
    refreshJobList: () => void;
}
export declare enum COMBINED_JOB_STATE {
    OPEN_AND_RUNNING = 0,
    OPEN_AND_STOPPED = 1,
    CLOSED = 2,
    UNKNOWN = 3
}
export declare const ModelSnapshotTable: FC<Props>;
export {};
