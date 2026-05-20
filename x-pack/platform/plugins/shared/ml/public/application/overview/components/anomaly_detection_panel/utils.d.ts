import type { MlSummaryJobs, MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { GroupsDictionary } from './anomaly_detection_panel';
export declare function getGroupsFromJobs(jobs: MlSummaryJobs): {
    groups: GroupsDictionary;
    count: number;
};
export declare function getStatsBarData(jobsList: MlSummaryJob[] | undefined, showNodeInfo: boolean): {
    activeDatafeeds: {
        label: string;
        value: number;
        show: boolean;
        group: number;
    };
    activeNodes?: {
        label: string;
        value: number;
        show: boolean;
        group: number;
    } | undefined;
    total: {
        label: string;
        value: number;
        show: boolean;
        group: number;
    };
    open: {
        label: string;
        value: number;
        show: boolean;
        group: number;
    };
    closed: {
        label: string;
        value: number;
        show: boolean;
        group: number;
    };
    failed: {
        label: string;
        value: number;
        show: boolean;
        group: number;
    };
};
