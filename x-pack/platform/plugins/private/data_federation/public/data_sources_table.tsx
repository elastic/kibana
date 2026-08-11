/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiButton, EuiButtonIcon, EuiInMemoryTable, EuiSpacer, EuiToolTip } from '@elastic/eui';

import { ALL_DATA_SOURCE_TYPES, type DataSource } from '../common';
import { getDataSourceTypeVerbose } from './get_data_source_type_label';
import { mainTranslations } from './main_i18n';

export interface DataSourcesTableProps {
  dataSources: DataSource[];
  selectedDataSources: DataSource[];
  dataSetsCountByDataSource: ReadonlyMap<string, number>;
  onSelectionChange: (next: DataSource[]) => void;
  onCreate: () => void;
  onEdit: (item: DataSource) => void;
  onDelete: (item: DataSource) => void;
  onDeleteSelected: (items: readonly DataSource[]) => void;
}

export const DataSourcesTable: FunctionComponent<DataSourcesTableProps> = ({
  dataSources,
  selectedDataSources,
  dataSetsCountByDataSource,
  onSelectionChange,
  onCreate,
  onEdit,
  onDelete,
  onDeleteSelected,
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<DataSource>>>(
    () => [
      {
        field: 'name',
        name: mainTranslations.columns.dataSources.name,
        sortable: true,
        width: '22%',
        'data-test-subj': 'dataSetsColName',
      },
      {
        name: mainTranslations.columns.dataSources.dataSetsCount,
        width: '10%',
        render: (item: DataSource) => dataSetsCountByDataSource.get(item.name) ?? 0,
        'data-test-subj': 'dataSetsColDataSetsCount',
      },
      {
        field: 'type',
        name: mainTranslations.columns.dataSources.type,
        sortable: true,
        width: '18%',
        render: (value: DataSource['type']) => getDataSourceTypeVerbose(value),
        'data-test-subj': 'dataSetsColType',
      },
      {
        field: 'description',
        name: mainTranslations.columns.dataSources.description,
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSetsColDescription',
      },
      {
        name: mainTranslations.columns.dataSources.actions,
        width: '8%',
        actions: [
          {
            enabled: (item) => ALL_DATA_SOURCE_TYPES.includes(item.type),
            render: (item: DataSource, isSupportedType: boolean) => (
              // EUI's default item action can't show a tooltip on a disabled icon button
              // (aria-disabled sets pointer-events: none, which blocks hover), so this
              // wraps the button manually to explain why editing is disabled.
              <EuiToolTip
                content={
                  isSupportedType
                    ? mainTranslations.columns.dataSources.editActionDescription
                    : mainTranslations.columns.dataSources.editActionUnsupportedTypeDescription
                }
              >
                <span tabIndex={0}>
                  <EuiButtonIcon
                    aria-label={mainTranslations.columns.dataSources.editAction}
                    iconType="pencil"
                    isDisabled={!isSupportedType}
                    onClick={() => onEdit(item)}
                    data-test-subj="dataSetsEditButton"
                  />
                </span>
              </EuiToolTip>
            ),
          },
          {
            // Same limitation as the edit action above: EUI can't show a tooltip on a
            // disabled default action icon, so this renders the button manually to explain
            // why deleting is disabled.
            render: (item: DataSource) => {
              const hasDataSets = (dataSetsCountByDataSource.get(item.name) ?? 0) > 0;
              return (
                <EuiToolTip
                  content={
                    hasDataSets
                      ? mainTranslations.columns.dataSources.deleteActionHasDataSetsDescription
                      : mainTranslations.columns.dataSources.deleteActionDescription
                  }
                >
                  <span tabIndex={0}>
                    <EuiButtonIcon
                      aria-label={mainTranslations.columns.dataSources.deleteAction}
                      iconType="trash"
                      color="danger"
                      isDisabled={hasDataSets}
                      onClick={() => onDelete(item)}
                      data-test-subj="dataSetsDeleteIconButton"
                    />
                  </span>
                </EuiToolTip>
              );
            },
          },
        ],
      },
    ],
    [dataSetsCountByDataSource, onDelete, onEdit]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiInMemoryTable<DataSource>
        items={dataSources}
        itemId="name"
        columns={columns}
        search={{
          box: {
            incremental: true,
            placeholder: mainTranslations.columns.dataSources.searchPlaceholder,
            'data-test-subj': 'dataSetsSearch',
            schema: {
              fields: {
                name: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
          toolsLeft:
            selectedDataSources.length > 0 ? (
              <EuiButton
                color="danger"
                data-test-subj="dataSetsDeleteButton"
                iconType="trash"
                onClick={() => {
                  onDeleteSelected(selectedDataSources);
                }}
              >
                {mainTranslations.actions.deleteButtonLabel}
              </EuiButton>
            ) : undefined,
          toolsRight: (
            <EuiButton
              fill
              color="primary"
              data-test-subj="dataSetsCreateButton"
              onClick={onCreate}
            >
              {mainTranslations.actions.addButtonLabel}
            </EuiButton>
          ),
        }}
        rowHeader="name"
        selection={{
          selected: selectedDataSources,
          onSelectionChange,
          selectable: (row) => (dataSetsCountByDataSource.get(row.name) ?? 0) === 0,
          selectableMessage: (selectable) =>
            selectable
              ? ''
              : mainTranslations.columns.dataSources.deleteActionHasDataSetsDescription,
        }}
        sorting
        pagination={{
          pageSizeOptions: [5, 10, 20],
          initialPageSize: 10,
        }}
        data-test-subj="dataSetsTable"
        tableCaption={mainTranslations.columns.dataSources.caption}
        noItemsMessage={mainTranslations.columns.dataSources.noItems}
        tableLayout="auto"
        responsiveBreakpoint={false}
      />
    </>
  );
};
