import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { DataVisualizerTableState } from '../../../../../common/types';
import type { FieldStatisticTableEmbeddableProps } from '../../../index_data_visualizer/embeddables/grid_embeddable/types';
import type { DataVisualizerTableItem } from './types';
export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;
interface DataVisualizerTableProps<T extends object> {
    items: T[];
    pageState: DataVisualizerTableState;
    updatePageState: (update: DataVisualizerTableState) => void;
    getItemIdToExpandedRowMap: (itemIds: string[], items: T[]) => ItemIdToExpandedRowMap;
    extendedColumns?: Array<EuiBasicTableColumn<T>>;
    showPreviewByDefault?: boolean;
    /** Callback to receive any updates when table or page state is changed **/
    onChange?: (update: Partial<DataVisualizerTableState>) => void;
    loading?: boolean;
    totalCount?: number;
    overallStatsRunning: boolean;
    renderFieldName?: FieldStatisticTableEmbeddableProps['renderFieldName'];
    error?: Error | string;
    isEsql?: boolean;
}
declare const UnmemoizedDataVisualizerTable: <T extends DataVisualizerTableItem>({ items, pageState, updatePageState, getItemIdToExpandedRowMap, extendedColumns, showPreviewByDefault, onChange, loading, totalCount, overallStatsRunning, renderFieldName, error, isEsql, }: DataVisualizerTableProps<T>) => React.JSX.Element;
export declare const DataVisualizerTable: typeof UnmemoizedDataVisualizerTable;
export {};
