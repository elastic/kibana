/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, ReactNode } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { DataSetListItem } from '../common/sample_data_sets_client';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { dataSourcePreviewFlyoutStrings } from './data_source_preview_flyout_i18n';
import { getDataSourceTypeLabel } from './get_data_source_type_label';
import { useDataSourceManagementAppContext } from './data_source_management_app_context';

/** Type label as a badge next to a title (page header or flyout header). */
export const DataSourceTypeBadge: FunctionComponent<{ type: DataSourceListItem['type'] }> = ({
  type,
}) => (
  <EuiBadge color="hollow" data-test-subj="dataSourcePreviewTypeBadge">
    {getDataSourceTypeLabel(type)}
  </EuiBadge>
);

export interface DataSourcePreviewTitleWithTypeProps {
  title: ReactNode;
  source: DataSourceListItem;
  titleSize: 'l' | 'm';
  heading: 'h1' | 'h2';
  titleId?: string;
  titleTestSubj?: string;
}

export const DataSourcePreviewTitleWithType: FunctionComponent<DataSourcePreviewTitleWithTypeProps> = ({
  title,
  source,
  titleSize,
  heading,
  titleId,
  titleTestSubj,
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
    <EuiFlexItem grow={false}>
      <EuiTitle size={titleSize}>
        {React.createElement(
          heading,
          {
            ...(titleId ? { id: titleId } : {}),
            ...(titleTestSubj ? { 'data-test-subj': titleTestSubj } : {}),
          },
          title
        )}
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <DataSourceTypeBadge type={source.type} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface DataSourcePreviewDescriptionProps {
  source: DataSourceListItem;
  /** Use Stack Management page `data-test-subj` values; otherwise flyout-oriented ids. */
  variant: 'page' | 'flyout';
}

export const DataSourcePreviewDescription: FunctionComponent<DataSourcePreviewDescriptionProps> = ({
  source,
  variant,
}) => {
  const textSubj =
    variant === 'page'
      ? 'dataSourceManagementPreviewPageDescription'
      : 'dataSourcePreviewFlyoutDescription';
  const emptySubj =
    variant === 'page'
      ? 'dataSourceManagementPreviewPageDescriptionEmpty'
      : 'dataSourcePreviewFlyoutDescriptionEmpty';

  return source.description.trim().length > 0 ? (
    <span data-test-subj={textSubj}>{source.description}</span>
  ) : (
    <EuiText color="subdued" size="s" data-test-subj={emptySubj}>
      {dataSourcePreviewFlyoutStrings.noDescription()}
    </EuiText>
  );
};

export interface DataSourcePreviewDetailsProps {
  sets: DataSetListItem[];
  /** Invoked after a data set is deleted so parents can refetch from the client. */
  onDataSetsChanged?: () => void;
}

/** Data sets list — same `EuiInMemoryTable` setup as the Data sources page (search, sort, pagination). */
export const DataSourcePreviewDetails: FunctionComponent<DataSourcePreviewDetailsProps> = ({
  sets,
  onDataSetsChanged,
}) => {
  const { dataSetsClient } = useDataSourceManagementAppContext();
  const [selectedItems, setSelectedItems] = useState<DataSetListItem[]>([]);

  useEffect(() => {
    setSelectedItems((prev) => prev.filter((item) => sets.some((row) => row.id === item.id)));
  }, [sets]);

  const deleteByIds = useCallback(
    async (ids: string[]) => {
      const idSet = new Set(ids);
      await dataSetsClient.delete(ids);
      setSelectedItems((prev) => prev.filter((item) => !idSet.has(item.id)));
      onDataSetsChanged?.();
    },
    [dataSetsClient, onDataSetsChanged]
  );

  const handleDelete = useCallback(
    async (item: DataSetListItem) => {
      await deleteByIds([item.id]);
    },
    [deleteByIds]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DataSetListItem>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.previewFlyout.setsColumnDataSet', {
          defaultMessage: 'Data set',
        }),
        sortable: true,
        width: '22%',
        truncateText: true,
        'data-test-subj': 'dataSourcePreviewFlyoutSetsColName',
      },
      {
        field: 'resource',
        name: dataSourcePreviewFlyoutStrings.setsColumnResource(),
        sortable: true,
        width: '28%',
        truncateText: true,
        'data-test-subj': 'dataSourcePreviewFlyoutSetsColResource',
      },
      {
        field: 'description',
        name: i18n.translate('dataSourceManagement.previewFlyout.setsColumnDescription', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        width: '26%',
        truncateText: true,
        'data-test-subj': 'dataSourcePreviewFlyoutSetsColDescription',
      },
      {
        name: i18n.translate('dataSourceManagement.previewFlyout.setsColumnActions', {
          defaultMessage: 'Actions',
        }),
        width: '100px',
        field: 'id',
        actions: [
          {
            name: i18n.translate('dataSourceManagement.deleteButtonLabel', {
              defaultMessage: 'Delete',
            }),
            description: dataSourcePreviewFlyoutStrings.deleteDataSetDescription(),
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            onClick: (item: DataSetListItem) => {
              void handleDelete(item);
            },
            'data-test-subj': 'dataSourcePreviewSetDelete',
          },
        ],
      },
    ],
    [handleDelete]
  );

  return (
    <EuiInMemoryTable<DataSetListItem>
      items={sets}
      itemId="id"
      columns={columns}
      search={{
        box: {
          incremental: true,
          placeholder: dataSourcePreviewFlyoutStrings.setsSearchPlaceholder(),
          'data-test-subj': 'dataSourcePreviewSetsSearch',
          schema: {
            fields: {
              name: { type: 'string' },
              resource: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        toolsLeft:
          selectedItems.length > 0 ? (
            <EuiButton
              color="danger"
              data-test-subj="dataSourcePreviewSetsBulkDeleteButton"
              iconType="trash"
              onClick={() => {
                void deleteByIds(selectedItems.map((item) => item.id));
              }}
            >
              {i18n.translate('dataSourceManagement.deleteButtonLabel', {
                defaultMessage: 'Delete',
              })}
            </EuiButton>
          ) : undefined,
      }}
      rowHeader="name"
      selection={{
        selected: selectedItems,
        onSelectionChange: setSelectedItems,
      }}
      sorting
      pagination={{
        pageSizeOptions: [5, 10, 20],
        initialPageSize: 10,
      }}
      data-test-subj="dataSourcePreviewFlyoutSetsTable"
      tableCaption={dataSourcePreviewFlyoutStrings.setsTableCaption()}
      noItemsMessage={dataSourcePreviewFlyoutStrings.emptySets()}
      tableLayout="auto"
      responsiveBreakpoint={false}
    />
  );
};

export interface DataSourcePreviewFooterActionsProps {
  closeLabel?: string;
  onClose?: () => void;
  onManageDataSets?: () => void;
  /**
   * When false, only the primary action is shown (full page uses Back in the header).
   * @default true
   */
  showCloseAction?: boolean;
}

export const DataSourcePreviewFooterActions: FunctionComponent<DataSourcePreviewFooterActionsProps> = ({
  closeLabel,
  onClose,
  onManageDataSets = () => {},
  showCloseAction = true,
}) => {
  const manageButton = (
    <EuiButton
      fill
      data-test-subj="dataSourcePreviewAddDataSet"
      onClick={onManageDataSets}
    >
      {dataSourcePreviewFlyoutStrings.addDataSetButton()}
    </EuiButton>
  );

  if (!showCloseAction) {
    return (
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{manageButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty data-test-subj="dataSourcePreviewFlyoutClose" onClick={onClose}>
          {closeLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{manageButton}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
