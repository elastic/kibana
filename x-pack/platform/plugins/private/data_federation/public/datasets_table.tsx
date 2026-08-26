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
  useEuiTheme,
} from '@elastic/eui';

import type { DataSetWithName, DataSource } from '../common';
import { DataSourceFilterButton } from './data_source_filter_button';
import { getDataSourceTypeVerbose } from './get_data_source_type_label';
import { AddDatasetMenuButton } from './add_dataset_menu_button';
import type { DatasetWizardFlowVariant } from './create_dataset_wizard/dataset_wizard_flow_variant';
import { mainTranslations } from './main_i18n';
import {
  DISABLED_TABLE_ROW_CLASS,
  EMPTY_DISABLED_DATA_SOURCE_NAMES,
  getDisabledTableRowCss,
} from './disabled_table_row_styles';

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
  disabledDataSourceNames?: ReadonlySet<string>;
}

interface DatasetsTableActionsCellProps {
  item: DataSetListRow;
  isOpenInDiscoverEnabled: boolean;
  isDatasetEnabled: boolean;
  onOpenInDiscover: (item: DataSetListRow) => void;
  onClone: (item: DataSetListRow) => void;
  onEdit: (item: DataSetListRow) => void;
  onDelete: (item: DataSetListRow) => void;
}

const DatasetsTableActionsCell: FunctionComponent<DatasetsTableActionsCellProps> = ({
  item,
  isOpenInDiscoverEnabled,
  isDatasetEnabled,
  onOpenInDiscover,
  onClone,
  onEdit,
  onDelete,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);
  const isDiscoverActionEnabled = isOpenInDiscoverEnabled && isDatasetEnabled;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            isDatasetEnabled
              ? mainTranslations.columns.dataSets.openInDiscoverActionDescription
              : mainTranslations.columns.dataSets.openInDiscoverDisabledBecauseDataset
          }
        >
          <span tabIndex={0}>
            <EuiButtonIcon
              iconType="discoverApp"
              color="text"
              aria-label={mainTranslations.columns.dataSets.openInDiscoverAction}
              disabled={!isDiscoverActionEnabled}
              onClick={() => onOpenInDiscover(item)}
              data-test-subj="dataSetsSetsOpenInDiscoverButton"
            />
          </span>
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

interface DatasetEnabledSwitchProps {
  item: DataSetListRow;
  isEnabled: boolean;
  isDataSourceDisabled: boolean;
  onEnabledChange: (name: string, enabled: boolean) => void;
}

const DatasetEnabledSwitch: FunctionComponent<DatasetEnabledSwitchProps> = ({
  item,
  isEnabled,
  isDataSourceDisabled,
  onEnabledChange,
}) => {
  const switchControl = (
    <EuiSwitch
      compressed
      showLabel={false}
      label={mainTranslations.columns.dataSets.enabledToggleAriaLabel(item.name)}
      checked={isEnabled}
      disabled={isDataSourceDisabled}
      onChange={(event) => {
        onEnabledChange(item.name, event.target.checked);
      }}
      data-test-subj={`dataSetsSetsEnabledSwitch-${item.name}`}
    />
  );

  if (!isDataSourceDisabled) {
    return switchControl;
  }

  return (
    <EuiToolTip content={mainTranslations.columns.dataSets.enabledToggleDisabledBecauseDataSource}>
      <span tabIndex={0}>{switchControl}</span>
    </EuiToolTip>
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
  disabledDataSourceNames = EMPTY_DISABLED_DATA_SOURCE_NAMES,
}) => {
  const { euiTheme } = useEuiTheme();
  const [enabledByName, setEnabledByName] = useState<Record<string, boolean>>({});
  const disabledRowCss = useMemo(() => getDisabledTableRowCss(euiTheme), [euiTheme]);

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
          const isDataSourceDisabled = disabledDataSourceNames.has(item.data_source);
          const isEnabled = (enabledByName[item.name] ?? true) && !isDataSourceDisabled;

          return (
            <DatasetEnabledSwitch
              item={item}
              isEnabled={isEnabled}
              isDataSourceDisabled={isDataSourceDisabled}
              onEnabledChange={(name, enabled) => {
                setEnabledByName((current) => ({
                  ...current,
                  [name]: enabled,
                }));
              }}
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
            isDatasetEnabled={
              (enabledByName[item.name] ?? true) &&
              !disabledDataSourceNames.has(item.data_source)
            }
            onOpenInDiscover={onOpenInDiscover}
            onClone={onClone}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [
      disabledDataSourceNames,
      enabledByName,
      isOpenInDiscoverEnabled,
      onClone,
      onDelete,
      onEdit,
      onOpenInDiscover,
    ]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiInMemoryTable<DataSetListRow>
        items={filteredItems}
        itemId="name"
        columns={columns}
        css={disabledRowCss}
        rowProps={(item) =>
          (enabledByName[item.name] ?? true) && !disabledDataSourceNames.has(item.data_source)
            ? undefined
            : { className: DISABLED_TABLE_ROW_CLASS }
        }
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
