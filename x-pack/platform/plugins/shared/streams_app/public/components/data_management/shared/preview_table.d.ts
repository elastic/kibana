import type { EuiDataGridColumnCellAction, EuiDataGridProps, EuiDataGridRowHeightsOptions } from '@elastic/eui';
import type { SampleDocument } from '@kbn/streams-schema';
import React from 'react';
import type { IgnoredField, DocumentWithIgnoredFields } from '@kbn/streams-schema/src/shared/record_types';
import type { SimulationContext } from '../stream_detail_enrichment/state_management/simulation_state_machine';
export type PreviewTableMode = 'columns' | 'summary';
export declare const SUMMARY_COLUMN_ID: string;
interface RowSelectionContextType {
    selectedRowIndex?: number;
    onRowSelected?: (rowIndex: number) => void;
}
export declare const RowSelectionContext: React.Context<RowSelectionContextType>;
export declare const MemoPreviewTable: React.MemoExoticComponent<typeof PreviewTable>;
export declare function PreviewTable({ documents, displayColumns, height, renderCellValue, rowHeightsOptions, sorting, setSorting, toolbarVisibility, setVisibleColumns, columnOrderHint, showLeadingControlColumns, cellActions, mode, streamName, viewModeToggle, dataViewFieldTypes, }: {
    documents: SampleDocument[] | DocumentWithIgnoredFields[];
    displayColumns?: string[];
    height?: EuiDataGridProps['height'];
    renderCellValue?: (doc: SampleDocument, columnId: string, ignoredFields?: IgnoredField[]) => React.ReactNode | undefined;
    rowHeightsOptions?: EuiDataGridRowHeightsOptions;
    toolbarVisibility?: boolean;
    setVisibleColumns?: (visibleColumns: string[]) => void;
    columnOrderHint?: string[];
    sorting?: SimulationContext['previewColumnsSorting'];
    setSorting?: (sorting: SimulationContext['previewColumnsSorting']) => void;
    showLeadingControlColumns?: boolean;
    cellActions?: EuiDataGridColumnCellAction[];
    mode?: PreviewTableMode;
    streamName?: string;
    viewModeToggle?: {
        currentMode: PreviewTableMode;
        setViewMode: (mode: PreviewTableMode) => void;
        isDisabled: boolean;
    };
    dataViewFieldTypes?: Array<{
        name: string;
        type: string;
        esType?: string;
    }>;
}): React.JSX.Element;
export {};
