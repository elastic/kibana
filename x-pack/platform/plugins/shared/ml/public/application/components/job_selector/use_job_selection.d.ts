import type { MlJobWithTimeRange } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
export interface JobSelection {
    jobIds: string[];
    selectedGroups: string[];
}
export declare const useJobSelection: (jobs: MlJobWithTimeRange[]) => {
    selectedIds: string[];
    selectedJobs: import("../../explorer/explorer_utils").ExplorerJob[];
};
