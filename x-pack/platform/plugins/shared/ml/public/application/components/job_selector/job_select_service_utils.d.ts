import type { Dictionary } from '@kbn/ml-common-types/common';
import type { MlJobWithTimeRange } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { MlJobGroupWithTimeRange } from './job_selector_flyout';
export declare function getGroupsFromJobs(jobs: MlJobWithTimeRange[]): {
    groups: MlJobGroupWithTimeRange[];
    groupsMap: Dictionary<any>;
};
export declare function getTimeRangeFromSelection(jobs: MlJobWithTimeRange[], selection: string[]): {
    from: string;
    to: string;
} | undefined;
export declare function normalizeTimes(jobs: MlJobWithTimeRange[], dateFormatTz: string, ganttBarWidth: number): MlJobWithTimeRange[];
