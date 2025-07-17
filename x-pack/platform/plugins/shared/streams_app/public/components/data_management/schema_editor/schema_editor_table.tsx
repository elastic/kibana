/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiDataGridColumnSortingConfig,
  EuiSearchBar,
  EuiScreenReaderOnly,
  EuiDataGrid,
  EuiDataGridCellProps,
  EuiDataGridControlColumn,
  EuiIconTip,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import { TABLE_COLUMNS, EMPTY_CONTENT, TableColumnName } from './constants';
import { FieldActionsCell } from './field_actions';
import { FieldParent } from './field_parent';
import { FieldStatusBadge } from './field_status';
import { TControls } from './hooks/use_controls';
import { SchemaField } from './types';
import { FieldType } from './field_type';

export function FieldsTable({
  isLoading,
  controls,
  defaultColumns,
  fields,
  stream,
  withTableActions,
  withToolbar,
}: {
  isLoading: boolean;
  controls: TControls;
  defaultColumns: TableColumnName[];
  fields: SchemaField[];
  stream: Streams.ingest.all.Definition;
  withTableActions: boolean;
  withToolbar: boolean;
}) {
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumns);
  // Column sorting
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridColumnSortingConfig[]>([]);

  const filteredFields = useMemo(
    () => filterFieldsByControls(fields, controls),
    [fields, controls]
  );

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
      trailingControlColumns={trailingColumns}
      gridStyle={{
        border: 'none',
        rowHover: 'none',
        header: 'underline',
      }}
      inMemory={{ level: 'sorting' }}
    />
  );
}

const createCellRenderer =
  (
    fields: SchemaField[],
    stream: Streams.ingest.all.Definition
  ): EuiDataGridCellProps['renderCellValue'] =>
  ({ rowIndex, columnId }) => {
    const field = fields[rowIndex];
    if (!field) return null;
    const { parent, status } = field;

    if (columnId === 'type') {
      if (!field.type) {
        if (field.status === 'unmapped' && field.esType) {
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
        return EMPTY_CONTENT;
      }
      return <FieldType type={field.type} aliasFor={field.alias_for} />;
    }

    if (columnId === 'parent') {
      return <FieldParent parent={parent} linkEnabled={field.parent !== stream.name} />;
    }

    if (columnId === 'status') {
      return <FieldStatusBadge status={status} />;
    }

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
