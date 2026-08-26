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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import { ALL_DATA_SOURCE_TYPES, type DataSource } from '../common';
import { DataSourceConnectionStatusHealth } from './data_source_connection_status_badge';
import { getMockDataSourceConnectionStatus } from './data_source_connection_status';
import { getDataSourceTypeVerbose } from './get_data_source_type_label';
import {
  DISABLED_TABLE_ROW_CLASS,
  EMPTY_DISABLED_DATA_SOURCE_NAMES,
  getDisabledTableRowCss,
} from './disabled_table_row_styles';
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
  onViewDataSetsForDataSource?: (dataSourceName: string) => void;
  disabledDataSourceNames?: ReadonlySet<string>;
  onDataSourceEnabledChange?: (name: string, enabled: boolean) => void;
}

interface DataSourcesTableActionsCellProps {
  item: DataSource;
  hasDataSets: boolean;
  onEdit: (item: DataSource) => void;
  onDelete: (item: DataSource) => void;
}

const DataSourcesTableActionsCell: FunctionComponent<DataSourcesTableActionsCellProps> = ({
  item,
  hasDataSets,
  onEdit,
  onDelete,
}) => {
  const isSupportedType = ALL_DATA_SOURCE_TYPES.includes(item.type);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
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
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const DataSourcesTable: FunctionComponent<DataSourcesTableProps> = ({
  dataSources,
  selectedDataSources,
  dataSetsCountByDataSource,
  onSelectionChange,
  onCreate,
  onEdit,
  onDelete,
  onDeleteSelected,
  onViewDataSetsForDataSource,
  disabledDataSourceNames = EMPTY_DISABLED_DATA_SOURCE_NAMES,
  onDataSourceEnabledChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const disabledRowCss = useMemo(() => getDisabledTableRowCss(euiTheme), [euiTheme]);

  const columns = useMemo<Array<EuiBasicTableColumn<DataSource>>>(
    () => [
      {
        field: 'name',
        name: mainTranslations.columns.dataSources.name,
        sortable: true,
        width: '20%',
        'data-test-subj': 'dataSetsColName',
      },
      {
        name: mainTranslations.columns.dataSources.status,
        sortable: (item: DataSource) => getMockDataSourceConnectionStatus(item.name),
        width: '14%',
        render: (item: DataSource) => (
          <DataSourceConnectionStatusHealth dataSourceName={item.name} />
        ),
        'data-test-subj': 'dataSetsColStatus',
      },
      {
        name: mainTranslations.columns.dataSources.dataSetsCount,
        width: '10%',
        render: (item: DataSource) => {
          const count = dataSetsCountByDataSource.get(item.name) ?? 0;

          if (count > 0 && onViewDataSetsForDataSource) {
            return (
              <EuiLink
                onClick={() => onViewDataSetsForDataSource(item.name)}
                aria-label={mainTranslations.columns.dataSources.viewDataSetsLinkAriaLabel(
                  count,
                  item.name
                )}
                data-test-subj="dataSetsCountLink"
              >
                {count}
              </EuiLink>
            );
          }

          return count;
        },
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
        name: mainTranslations.columns.dataSources.enabled,
        width: '1%',
        render: (item: DataSource) => {
          const isEnabled = !disabledDataSourceNames.has(item.name);

          return (
            <EuiSwitch
              compressed
              showLabel={false}
              label={mainTranslations.columns.dataSources.enabledToggleAriaLabel(item.name)}
              checked={isEnabled}
              onChange={(event) => {
                onDataSourceEnabledChange?.(item.name, event.target.checked);
              }}
              data-test-subj={`dataSetsEnabledSwitch-${item.name}`}
            />
          );
        },
        'data-test-subj': 'dataSetsColEnabled',
      },
      {
        name: mainTranslations.columns.dataSources.actions,
        width: '1%',
        align: 'right',
        render: (item: DataSource) => (
          <DataSourcesTableActionsCell
            item={item}
            hasDataSets={(dataSetsCountByDataSource.get(item.name) ?? 0) > 0}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [
      dataSetsCountByDataSource,
      disabledDataSourceNames,
      onDataSourceEnabledChange,
      onDelete,
      onEdit,
      onViewDataSetsForDataSource,
    ]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiInMemoryTable<DataSource>
        items={dataSources}
        itemId="name"
        columns={columns}
        css={disabledRowCss}
        rowProps={(item) =>
          disabledDataSourceNames.has(item.name)
            ? { className: DISABLED_TABLE_ROW_CLASS }
            : undefined
        }
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
