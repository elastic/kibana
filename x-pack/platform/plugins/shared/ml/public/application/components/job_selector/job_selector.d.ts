import React from 'react';
import type { Dictionary } from '@kbn/ml-common-types/common';
import type { MlJobWithTimeRange, MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { ExplorerJob } from '../../explorer/explorer_utils';
export interface GroupObj {
    groupId: string;
    jobIds: string[];
}
type GroupsMap = Dictionary<string[]>;
export declare function getInitialGroupsMap(selectedGroups: GroupObj[]): GroupsMap;
export interface JobSelectorProps {
    dateFormatTz: string;
    singleSelection: boolean;
    timeseriesOnly: boolean;
    onSelectionChange?: ({ jobIds, time, }: {
        jobIds: string[];
        time?: {
            from: string;
            to: string;
        };
    }) => void;
    selectedJobIds?: string[];
    selectedGroups?: GroupObj[];
    selectedJobs?: MlSummaryJob[] | ExplorerJob[];
}
export interface JobSelectionMaps {
    jobsMap: Dictionary<MlJobWithTimeRange>;
    groupsMap: Dictionary<string[]>;
}
export declare function JobSelector({ dateFormatTz, singleSelection, timeseriesOnly, selectedJobIds, selectedGroups, selectedJobs, onSelectionChange, }: JobSelectorProps): React.JSX.Element;
export {};
