/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';

import type { DataSetWithName, DataSource } from '../common';
import { DataSourceFilterButton } from './data_source_filter_button';
import { getDataSourceTypeVerbose } from './get_data_source_type_label';
import { AddDatasetMenuButton } from './add_dataset_menu_button';
import type { DatasetWizardFlowVariant } from './create_dataset_wizard/dataset_wizard_flow_variant';
import { mainTranslations } from './main_i18n';

/** Data set row in the table; `type` is resolved from the linked data source. */
export type DataSetListRow = DataSetWithName & { type?: DataSource['type'] };

export interface DatasetsTableProps {
  filteredItems: DataSetListRow[];
  selectedItems: DataSetListRow[];
  dataSourceNames: string[];
  dataSourceFilter: readonly string[];
  onSelectionChange: (next: DataSetListRow[]) => void;
  onDataSourceFilterChange: (next: string[]) => void;
  onCreate: (flowVariant: DatasetWizardFlowVariant) => void;
  onEdit: (item: DataSetListRow) => void;
  onClone: (item: DataSetListRow) => void;
  onOpenInDiscover: (item: DataSetListRow) => void;
  isOpenInDiscoverEnabled?: boolean;
  onDelete: (item: DataSetListRow) => void;
  onDeleteSelected: (items: DataSetListRow[]) => void;
}

interface DatasetsTableActionsCellProps {
  item: DataSetListRow;
  isOpenInDiscoverEnabled: boolean;
  onOpenInDiscover: (item: DataSetListRow) => void;
  onClone: (item: DataSetListRow) => void;
  onEdit: (item: DataSetListRow) => void;
  onDelete: (item: DataSetListRow) => void;
}

const DatasetsTableActionsCell: FunctionComponent<DatasetsTableActionsCellProps> = ({
  item,
  isOpenInDiscoverEnabled,
  onOpenInDiscover,
  onClone,
  onEdit,
  onDelete,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={mainTranslations.columns.dataSets.openInDiscoverActionDescription}>
          <EuiButtonIcon
            iconType="discoverApp"
            color="text"
            aria-label={mainTranslations.columns.dataSets.openInDiscoverAction}
            disabled={!isOpenInDiscoverEnabled}
            onClick={() => onOpenInDiscover(item)}
            data-test-subj="dataSetsSetsOpenInDiscoverButton"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiToolTip
              content={mainTranslations.columns.dataSets.moreActions}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="boxesHorizontal"
                color="text"
                aria-label={mainTranslations.columns.dataSets.moreActions}
                onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
                data-test-subj="euiCollapsedItemActionsButton"
              />
            </EuiToolTip>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="leftCenter"
        >
          <EuiContextMenuPanel
            size="s"
            items={[
              <EuiContextMenuItem
                key="clone"
                icon="copy"
                data-test-subj="dataSetsSetsCloneButton"
                onClick={() => {
                  closePopover();
                  onClone(item);
                }}
              >
                {mainTranslations.columns.dataSets.cloneAction}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="edit"
                icon="pencil"
                data-test-subj="dataSetsSetsEditButton"
                onClick={() => {
                  closePopover();
                  onEdit(item);
                }}
              >
                {mainTranslations.columns.dataSets.editAction}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key="delete"
                icon="trash"
                color="danger"
                data-test-subj="dataSetsSetsDeleteIconButton"
                onClick={() => {
                  closePopover();
                  onDelete(item);
                }}
              >
                {mainTranslations.columns.dataSets.deleteAction}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const DatasetsTable: FunctionComponent<DatasetsTableProps> = ({
  filteredItems,
  selectedItems,
  dataSourceNames,
  dataSourceFilter,
  onSelectionChange,
  onDataSourceFilterChange,
  onCreate,
  onEdit,
  onClone,
  onOpenInDiscover,
  isOpenInDiscoverEnabled = false,
  onDelete,
  onDeleteSelected,
}) => {
  const [enabledByName, setEnabledByName] = useState<Record<string, boolean>>({});

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
        name: mainTranslations.columns.dataSets.enabled,
        width: '1%',
        render: (item: DataSetListRow) => {
          const isEnabled = enabledByName[item.name] ?? true;

          return (
            <EuiSwitch
              compressed
              showLabel={false}
              label={mainTranslations.columns.dataSets.enabledToggleAriaLabel(item.name)}
              checked={isEnabled}
              onChange={(event) => {
                setEnabledByName((current) => ({
                  ...current,
                  [item.name]: event.target.checked,
                }));
              }}
              data-test-subj={`dataSetsSetsEnabledSwitch-${item.name}`}
            />
          );
        },
        'data-test-subj': 'dataSetsSetsColEnabled',
      },
      {
        name: mainTranslations.columns.dataSets.actions,
        width: '1%',
        align: 'right',
        render: (item: DataSetListRow) => (
          <DatasetsTableActionsCell
            item={item}
            isOpenInDiscoverEnabled={isOpenInDiscoverEnabled}
            onOpenInDiscover={onOpenInDiscover}
            onClone={onClone}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [enabledByName, isOpenInDiscoverEnabled, onClone, onDelete, onEdit, onOpenInDiscover]
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
                <DataSourceFilterButton
                  dataSourceNames={dataSourceNames}
                  selectedDataSourceNames={dataSourceFilter}
                  onChange={onDataSourceFilterChange}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AddDatasetMenuButton onSelectFlow={onCreate} />
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
