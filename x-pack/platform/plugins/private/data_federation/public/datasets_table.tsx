/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import type { DataSetWithName, DataSource } from '../common';
import { getDataSourceTypeVerbose } from './get_data_source_type_label';
import { mainTranslations } from './main_i18n';

/** Data set row in the table; `type` is resolved from the linked data source. */
export type DataSetListRow = DataSetWithName & { type?: DataSource['type'] };

export interface DatasetsTableProps {
  filteredItems: DataSetListRow[];
  selectedItems: DataSetListRow[];
  dataSourceFilterOptions: Array<{ value: string; text: string }>;
  dataSourceFilter: string;
  isCreateDisabled: boolean;
  onSelectionChange: (next: DataSetListRow[]) => void;
  onDataSourceFilterChange: (next: string) => void;
  onCreate: () => void;
  onEdit: (item: DataSetListRow) => void;
  onDelete: (item: DataSetListRow) => void;
  onDeleteSelected: (items: DataSetListRow[]) => void;
}

export const DatasetsTable: FunctionComponent<DatasetsTableProps> = ({
  filteredItems,
  selectedItems,
  dataSourceFilterOptions,
  dataSourceFilter,
  isCreateDisabled,
  onSelectionChange,
  onDataSourceFilterChange,
  onCreate,
  onEdit,
  onDelete,
  onDeleteSelected,
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<DataSetListRow>>>(
    () => [
      {
        field: 'name',
        name: mainTranslations.columns.dataSets.name,
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSetsSetsColName',
      },
      {
        field: 'data_source',
        name: mainTranslations.columns.dataSets.dataSourceId,
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSetsSetsColDataSourceId',
      },
      {
        field: 'type',
        name: mainTranslations.columns.dataSets.dataSourceType,
        render: (type: DataSetListRow['type']) =>
          type
            ? getDataSourceTypeVerbose(type)
            : mainTranslations.columns.dataSets.dataSourceTypeMissing,
        sortable: true,
        width: '18%',
        'data-test-subj': 'dataSetsSetsColDataSourceType',
      },
      {
        field: 'resource',
        name: mainTranslations.columns.dataSets.resource,
        sortable: true,
        width: '22%',
        'data-test-subj': 'dataSetsSetsColResource',
      },
      {
        field: 'description',
        name: mainTranslations.columns.dataSets.description,
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSetsSetsColDescription',
      },
      {
        name: mainTranslations.columns.dataSets.actions,
        width: '8%',
        actions: [
          {
            name: mainTranslations.columns.dataSets.editAction,
            description: mainTranslations.columns.dataSets.editActionDescription,
            icon: 'pencil',
            type: 'icon',
            onClick: (item) => {
              onEdit(item);
            },
            'data-test-subj': 'dataSetsSetsEditButton',
          },
          {
            name: mainTranslations.columns.dataSets.deleteAction,
            description: mainTranslations.columns.dataSets.deleteActionDescription,
            icon: 'trash',
            color: 'danger',
            type: 'icon',
            onClick: (item) => {
              onDelete(item);
            },
            'data-test-subj': 'dataSetsSetsDeleteIconButton',
          },
        ],
      },
    ],
    [onDelete, onEdit]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiInMemoryTable<DataSetListRow>
        items={filteredItems}
        itemId="name"
        columns={columns}
        search={{
          box: {
            incremental: true,
            placeholder: mainTranslations.columns.dataSets.searchPlaceholder,
            'data-test-subj': 'dataSetsSetsSearch',
            schema: {
              fields: {
                name: { type: 'string' },
                data_source: { type: 'string' },
                type: { type: 'string' },
                resource: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
          toolsLeft:
            selectedItems.length > 0 ? (
              <EuiButton
                color="danger"
                data-test-subj="dataSetsSetsDeleteButton"
                iconType="trash"
                onClick={() => {
                  onDeleteSelected(selectedItems);
                }}
              >
                {mainTranslations.actions.deleteButtonLabel}
              </EuiButton>
            ) : undefined,
          toolsRight: (
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiSelect
                  data-test-subj="dataSetsSetsDataSourceFilter"
                  aria-label={mainTranslations.filters.dataSource}
                  options={dataSourceFilterOptions}
                  value={dataSourceFilter}
                  onChange={(e) => onDataSourceFilterChange(e.target.value)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="primary"
                  data-test-subj="dataSetsSetsCreateButton"
                  onClick={onCreate}
                  disabled={isCreateDisabled}
                >
                  {mainTranslations.columns.dataSets.addButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        }}
        rowHeader="name"
        selection={{
          selected: selectedItems,
          onSelectionChange,
        }}
        sorting
        pagination={{
          pageSizeOptions: [5, 10, 20],
          initialPageSize: 10,
        }}
        data-test-subj="dataSetsSetsTable"
        tableCaption={mainTranslations.columns.dataSets.caption}
        noItemsMessage={mainTranslations.columns.dataSets.noItems}
        tableLayout="auto"
        responsiveBreakpoint={false}
      />
    </>
  );
};
