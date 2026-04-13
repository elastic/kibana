import type { EuiDataGridRowHeightsOptions, EuiDataGridSetCellProps } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SampleDocument } from '@kbn/streams-schema';
import type { IgnoredField, DocumentWithIgnoredFields } from '@kbn/streams-schema/src/shared/record_types';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { PreviewTableMode } from './preview_table';
export declare function isDocumentWithIgnoredFields(doc: SampleDocument | DocumentWithIgnoredFields): doc is DocumentWithIgnoredFields;
interface CellRenderBaseProps {
    rowIndex: number;
    columnId: string;
    setCellProps: (props: EuiDataGridSetCellProps) => void;
    isDetails: boolean;
    isExpanded: boolean;
    isExpandable: boolean;
    colIndex: number;
    mode: PreviewTableMode;
    dataView?: DataView;
    currentRowHeights?: EuiDataGridRowHeightsOptions;
    renderCellValue?: (doc: SampleDocument, columnId: string, ignoredFields?: IgnoredField[]) => React.ReactNode | undefined;
    core: CoreStart;
    share: SharePluginStart;
    fieldFormats: FieldFormatsStart;
}
interface PreviewTableCellProps extends CellRenderBaseProps {
    documents: SampleDocument[] | DocumentWithIgnoredFields[];
}
export declare function PreviewTableCell({ rowIndex, columnId, setCellProps, isDetails, isExpanded, isExpandable, colIndex, documents, mode, dataView, currentRowHeights, renderCellValue, core, share, fieldFormats, }: PreviewTableCellProps): React.JSX.Element;
export {};
