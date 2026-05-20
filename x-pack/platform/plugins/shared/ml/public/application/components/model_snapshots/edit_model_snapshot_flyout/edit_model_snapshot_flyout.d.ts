import type { FC } from 'react';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { ModelSnapshot } from '@kbn/ml-common-types/anomaly_detection_jobs/model_snapshot';
interface Props {
    snapshot: ModelSnapshot;
    job: CombinedJobWithStats;
    closeFlyout(reload: boolean): void;
}
export declare const EditModelSnapshotFlyout: FC<Props>;
export {};
