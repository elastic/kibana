import React from 'react';
import type { EuiDataGridToolBarVisibilityOptions } from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';
import type { TableColumnName } from './constants';
import type { TControls } from './hooks/use_controls';
import type { SchemaField } from './types';
export declare function FieldsTable({ isLoading, controls, defaultColumns, fields, stream, withTableActions, withToolbar, selectedFields, onFieldSelection, }: {
    isLoading: boolean;
    controls: TControls;
    defaultColumns: TableColumnName[];
    fields: SchemaField[];
    stream: Streams.all.Definition;
    withTableActions: boolean;
    withToolbar: boolean | EuiDataGridToolBarVisibilityOptions;
    selectedFields: string[];
    onFieldSelection: (names: string[], checked: boolean) => void;
}): React.JSX.Element;
export declare const isSelectableField: (streamName: string, field: SchemaField) => boolean;
