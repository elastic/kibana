import React from 'react';
import type { Filter, Query } from '@kbn/es-query';
import { type GetCustomFieldType } from '@kbn/unified-field-list';
import { type DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DatasourceDataPanelProps, IndexPattern, IndexPatternField } from '@kbn/lens-common';
interface FieldItemBaseProps {
    highlight?: string;
    exists: boolean;
    hideDetails?: boolean;
    itemIndex: number;
    groupIndex: number;
    dropOntoWorkspace: DatasourceDataPanelProps['dropOntoWorkspace'];
    hasSuggestionForField: DatasourceDataPanelProps['hasSuggestionForField'];
}
export interface FieldItemIndexPatternFieldProps extends FieldItemBaseProps {
    field: IndexPatternField;
    indexPattern: IndexPattern;
    query: Query;
    dateRange: DatasourceDataPanelProps['dateRange'];
    filters: Filter[];
    editField?: (name: string) => void;
    removeField?: (name: string) => void;
    getCustomFieldType?: never;
}
export interface FieldItemDatatableColumnProps extends FieldItemBaseProps {
    field: DatatableColumn;
    indexPattern?: never;
    query?: never;
    dateRange?: never;
    filters?: never;
    editField?: never;
    removeField?: never;
    getCustomFieldType: GetCustomFieldType<DatatableColumn>;
}
export type FieldItemProps = FieldItemIndexPatternFieldProps | FieldItemDatatableColumnProps;
export declare function InnerFieldItem(props: FieldItemProps): React.JSX.Element;
export declare const FieldItem: typeof InnerFieldItem;
export {};
