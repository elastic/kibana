import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
export interface AlertEpisodeMetadataTableProps {
    hit: DataTableRecord;
    dataView: DataView;
    renderTable: (props: {
        hit: DataTableRecord;
        dataView: DataView;
    }) => React.ReactNode;
    isStale: boolean;
    dataTimestamp?: string;
    dateFormat?: string;
}
export declare const AlertEpisodeMetadataTable: ({ hit, dataView, renderTable, isStale, dataTimestamp, dateFormat, }: AlertEpisodeMetadataTableProps) => React.JSX.Element;
