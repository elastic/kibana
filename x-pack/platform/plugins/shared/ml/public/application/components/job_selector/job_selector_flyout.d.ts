import type { FC } from 'react';
import type { MlJobTimeRange } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { JobSelectionMaps } from './job_selector';
export declare const BADGE_LIMIT = 10;
export declare const DEFAULT_GANTT_BAR_WIDTH = 299;
export interface JobSelectionResult {
    newSelection: string[];
    jobIds: string[];
    time?: {
        from: string;
        to: string;
    } | undefined;
}
export interface JobSelectorFlyoutProps {
    dateFormatTz: string;
    selectedIds?: string[];
    newSelection?: string[];
    onFlyoutClose: () => void;
    onJobsFetched?: (maps: JobSelectionMaps) => void;
    onSelectionConfirmed: (payload: JobSelectionResult) => void;
    singleSelection: boolean;
    timeseriesOnly: boolean;
    withTimeRangeSelector?: boolean;
    applyTimeRangeConfig?: boolean;
    onTimeRangeConfigChange?: (v: boolean) => void;
    flyoutTitleId?: string;
}
export interface MlJobGroupWithTimeRange {
    id: string;
    jobIds: string[];
    timeRange: MlJobTimeRange;
}
export declare const JobSelectorFlyoutContent: FC<JobSelectorFlyoutProps>;
