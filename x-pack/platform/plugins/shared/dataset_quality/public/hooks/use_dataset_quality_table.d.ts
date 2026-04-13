import React from 'react';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import type { SortDirection } from '../../common/types';
export type DatasetTableSortField = keyof DataStreamStat;
export declare const useDatasetQualityTable: () => {
    sort: {
        sort: {
            field: keyof DataStreamStat;
            direction: SortDirection;
        };
    };
    onTableChange: (options: {
        page: {
            index: number;
            size: number;
        };
        sort?: {
            field: DatasetTableSortField;
            direction: SortDirection;
        };
    }) => void;
    pagination: {
        pageIndex: number;
        pageSize: number;
        totalItemCount: number;
        hidePerPageOptions: boolean;
    };
    filteredItems: DataStreamStat[];
    renderedItems: DataStreamStat[];
    columns: import("@elastic/eui/src/components/basic_table/basic_table").EuiBasicTableColumn<DataStreamStat>[];
    loading: boolean;
    resultsCount: React.JSX.Element;
    showInactiveDatasets: boolean;
    showFullDatasetNames: boolean;
    canUserMonitorAnyDataset: boolean;
    canUserMonitorAnyDataStream: boolean;
    toggleInactiveDatasets: () => void;
    toggleFullDatasetNames: () => void;
    updateFailureStore: ({ failureStoreEnabled, customRetentionPeriod, dataStreamName, }: {
        failureStoreEnabled: boolean;
        customRetentionPeriod?: string;
        dataStreamName: string;
    }) => void;
};
