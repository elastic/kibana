import React from 'react';
import { type DataFrameAnalyticsId, type DataFrameAnalyticsStats } from '@kbn/ml-data-frame-analytics-utils';
import type { DataFrameAnalyticsListRow } from './common';
export declare const getTaskStateBadge: (state: DataFrameAnalyticsStats["state"], failureReason?: DataFrameAnalyticsStats["failure_reason"]) => React.JSX.Element;
export declare const getJobTypeBadge: (jobType: string) => React.JSX.Element;
export declare const progressColumn: {
    name: string;
    truncateText: boolean;
    render(item: DataFrameAnalyticsListRow): React.JSX.Element;
    width: string;
    'data-test-subj': string;
};
export declare const DFAnalyticsJobIdLink: ({ jobId }: {
    jobId: string;
}) => React.JSX.Element;
export declare const useColumns: (expandedRowItemIds: DataFrameAnalyticsId[], setExpandedRowItemIds: React.Dispatch<React.SetStateAction<DataFrameAnalyticsId[]>>, isMlEnabledInSpace?: boolean, refresh?: () => void) => {
    columns: any[];
    modals: JSX.Element | null;
};
