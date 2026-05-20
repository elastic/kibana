import type { FC } from 'react';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { ModelSnapshot } from '@kbn/ml-common-types/anomaly_detection_jobs/model_snapshot';
interface Props {
    snapshot: ModelSnapshot;
    snapshots: ModelSnapshot[];
    job: CombinedJobWithStats;
    closeFlyout(): void;
    refresh(): void;
}
export declare const RevertModelSnapshotFlyout: FC<Props>;
export {};
