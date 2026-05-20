import type { FC } from 'react';
import type { MlJobWithTimeRange } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
export interface ExplorerUrlStateManagerProps {
    jobsWithTimeRange: MlJobWithTimeRange[];
}
export declare const ExplorerUrlStateManager: FC<ExplorerUrlStateManagerProps>;
