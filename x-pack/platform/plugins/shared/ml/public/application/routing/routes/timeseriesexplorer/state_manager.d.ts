import type { FC } from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { MlJobWithTimeRange } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
export interface TimeSeriesExplorerUrlStateManager {
    config: IUiSettingsClient;
    jobsWithTimeRange: MlJobWithTimeRange[];
}
export declare const TimeSeriesExplorerUrlStateManager: FC<TimeSeriesExplorerUrlStateManager>;
