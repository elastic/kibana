/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import type {
  EuiDataGridColumnSortingConfig,
  EuiDataGridCellProps,
  EuiDataGridControlColumn,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import {
  EuiSearchBar,
  EuiScreenReaderOnly,
  EuiDataGrid,
  EuiIconTip,
  EuiFlexGroup,
  EuiCheckbox,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { getStreamTypeFromDefinition } from '../../../util/get_stream_type_from_definition';
import type { TableColumnName } from './constants';
import { TABLE_COLUMNS, EMPTY_CONTENT } from './constants';
import { FieldActionsCell } from './field_actions';
import { FieldParent } from './field_parent';
import { FieldStatusBadge } from './field_status';
import { FieldResultBadge } from './field_result';
import type { TControls } from './hooks/use_controls';
import type { SchemaField, SchemaEditorField } from './types';
import { FieldType } from './field_type';

export function FieldsTable({
  isLoading,
  controls,
  defaultColumns,
  fields,
  stream,
  withTableActions,
  withToolbar,
  selectedFields,
  onFieldSelection,
}: {
  isLoading: boolean;
  controls: TControls;
  defaultColumns: TableColumnName[];
  fields: SchemaField[];
  stream: Streams.all.Definition;
  withTableActions: boolean;
  withToolbar: boolean | EuiDataGridToolBarVisibilityOptions;
  selectedFields: string[];
  onFieldSelection: (names: string[], checked: boolean) => void;
}) {
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumns);
  // Column sorting
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridColumnSortingConfig[]>([]);

  const filteredFields = useMemo(
    () => filterFieldsByControls(fields, controls),
    [fields, controls]
  );

  const leadingColumns = useMemo(() => {
    if (!withTableActions) return undefined;

    return [
      createFieldSelectionCellRenderer(
        filteredFields,
        selectedFields,
        onFieldSelection,
        stream.name
      ),
    ];
  }, [withTableActions, filteredFields, selectedFields, onFieldSelection, stream.name]);

  const trailingColumns = useMemo(() => {
    if (!withTableActions) return undefined;

    return [createFieldActionsCellRenderer(filteredFields)];
  }, [withTableActions, filteredFields]);

  const RenderCellValue = useMemo(
    () => createCellRenderer(filteredFields, stream),
    [filteredFields, stream]
  );

  return (
    <EuiDataGrid
      data-test-subj={
        isLoading
          ? 'streamsAppSchemaEditorFieldsTableLoading'
          : 'streamsAppSchemaEditorFieldsTableLoaded'
      }
      aria-label={i18n.translate(
        'xpack.streams.streamDetailSchemaEditor.fieldsTable.actionsTitle',
        { defaultMessage: 'Preview' }
      )}
      columns={Object.entries(TABLE_COLUMNS).map(([columnId, value]) => ({
        id: columnId,
        ...value,
      }))}
      columnVisibility={{
        visibleColumns,
        setVisibleColumns,
        canDragAndDropColumns: false,
      }}
      sorting={{ columns: sortingColumns, onSort: setSortingColumns }}
      toolbarVisibility={withToolbar}
      rowCount={filteredFields.length}
      renderCellValue={RenderCellValue}
      leadingControlColumns={leadingColumns}
      trailingControlColumns={trailingColumns}
      gridStyle={{
        border: 'all',
        rowHover: 'highlight',
        header: 'shade',
      }}
      inMemory={{ level: 'sorting' }}
    />
  );
}

const createCellRenderer =
  (
    fields: SchemaField[],
    stream: Streams.all.Definition
  ): EuiDataGridCellProps['renderCellValue'] =>
  ({ rowIndex, columnId }) => {
    const field = fields[rowIndex];
    if (!field) return null;
    const { parent, status } = field;

    if (columnId === 'type') {
      // Prioritize showing esType if available and different from our supported type
      if (field.esType && (!field.type || field.type === 'system')) {
        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            {field.esType}
            <EuiIconTip
              content={i18n.translate(
                'xpack.streams.streamDetailSchemaEditorFieldsTableTypeEsTypeTooltip',
                {
                  defaultMessage:
                    'This field is not managed by Streams, but is defined in Elasticsearch. It can also be controlled via the underlying index template and component templates available in the "Advanced" tab.',
                }
              )}
              position="right"
            />
          </EuiFlexGroup>
        );
      }

      if (!field.type) {
        // For fields with undefined type (unmanaged fields), show "dynamic" only for classic streams
        if (field.status === 'unmapped') {
          const streamType = getStreamTypeFromDefinition(stream);
          if (streamType === 'classic') {
            return <>{'<dynamic>'}</>;
          }

          return EMPTY_CONTENT;
        }
        return EMPTY_CONTENT;
      }
      return <FieldType type={field.type} aliasFor={field.alias_for} />;
    }

    if (columnId === 'parent') {
      return <FieldParent parent={parent} linkEnabled={field.parent !== stream.name} />;
    }

    if (columnId === 'status') {
      const editorField = field as SchemaEditorField;
      const streamType = getStreamTypeFromDefinition(stream);
      return (
        <FieldStatusBadge
          status={status}
          uncommitted={editorField.uncommitted}
          streamType={streamType}
        />
      );
    }

    if (columnId === 'result') {
      const editorField = field as SchemaEditorField;
      if (editorField.result) {
        return <FieldResultBadge result={editorField.result} />;
      }
      return EMPTY_CONTENT;
    }

    // @ts-expect-error upgrade typescript v5.9.3
    return <>{field[columnId as keyof SchemaField] || EMPTY_CONTENT}</>;
  };

const createFieldActionsCellRenderer = (fields: SchemaField[]): EuiDataGridControlColumn => ({
  id: 'field-actions',
  width: 40,
  headerCellRender: () => (
    <EuiScreenReaderOnly>
      <span>
        {i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableActionsTitle', {
          defaultMessage: 'Field actions',
        })}
      </span>
    </EuiScreenReaderOnly>
  ),
  rowCellRender: ({ rowIndex }) => {
    const field = fields[rowIndex];

    if (!field) return null;

    return <FieldActionsCell field={field} />;
  },
});

const createFieldSelectionCellRenderer = (
  fields: SchemaField[],
  selectedFields: string[],
  onChange: (names: string[], checked: boolean) => void,
  streamName: string
): EuiDataGridControlColumn => ({
  id: 'field-selection',
  width: 40,
  headerCellRender: () => {
    const selectableFields = fields.filter((field) => isSelectableField(streamName, field));
    if (selectableFields.length === 0) {
      return;
    }

    return (
      <EuiCheckbox
        id="selectAllFields"
        onChange={(e) => {
          onChange(
            selectableFields.map((field) => field.name),
            e.target.checked
          );
        }}
        checked={selectableFields.every((field) => selectedFields.includes(field.name))}
        indeterminate={
          selectedFields.length > 0 &&
          !selectableFields.every((field) => selectedFields.includes(field.name))
        }
      />
    );
  },
  rowCellRender: ({ rowIndex }) => {
    const field = fields[rowIndex];

    if (!isSelectableField(streamName, field)) return null;

    return (
      <EuiCheckbox
        id={field.name}
        onChange={(e) => onChange([field.name], e.target.checked)}
        checked={selectedFields.includes(field.name)}
      />
    );
  },
});

const filterFieldsByControls = (fields: SchemaField[], controls: TControls) => {
  if (!controls.query && isEmpty(controls.type) && isEmpty(controls.status)) {
    return fields;
  }

  const matchingQueryFields = EuiSearchBar.Query.execute(controls.query, fields, {
    defaultFields: ['name', 'type'],
  });

  const filteredByGroupsFields = matchingQueryFields.filter((field) => {
    return (
      (isEmpty(controls.type) || (field.type && controls.type.includes(field.type))) && // Filter by applied type
      (isEmpty(controls.status) || controls.status.includes(field.status)) // Filter by applied status
    );
  });

  return filteredByGroupsFields;
};

export const isSelectableField = (streamName: string, field: SchemaField) => {
  return (
    field.status !== 'inherited' &&
    field.parent === streamName &&
    !field.alias_for &&
    field.type !== 'system'
  );
};
