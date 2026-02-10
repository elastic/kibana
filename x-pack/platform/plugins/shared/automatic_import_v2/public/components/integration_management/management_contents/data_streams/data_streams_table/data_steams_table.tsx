/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import type { EuiBasicTableColumn, EuiTableSortingType, Criteria } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiConfirmModal,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { DataStreamResponse } from '../../../../../../common';
import * as i18n from '../translations';
import { useDeleteDataStream } from '../../../../../common';
import { InputTypesBadges } from './input_types_badges';
import { Status } from './status';

interface DataStreamsTableProps {
  integrationId: string;
  items: DataStreamResponse[];
}

export const DataStreamsTable = ({ integrationId, items }: DataStreamsTableProps) => {
  const { euiTheme } = useEuiTheme();
  const { deleteDataStreamMutation } = useDeleteDataStream();
  const [dataStreamDeleteTarget, setDataStreamDeleteTarget] = useState<DataStreamResponse | null>(
    null
  );
  const deleteModalTitleId = useGeneratedHtmlId();
  const [sortField, setSortField] = useState<keyof DataStreamResponse>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sorting: EuiTableSortingType<DataStreamResponse> = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const onTableChange = ({ sort }: Criteria<DataStreamResponse>) => {
    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortDirection]);

  const deletingDataStreamId = deleteDataStreamMutation.isLoading
    ? deleteDataStreamMutation.variables?.dataStreamId
    : undefined;

  const handleDeleteConfirm = () => {
    if (dataStreamDeleteTarget) {
      setDataStreamDeleteTarget(null);
      deleteDataStreamMutation.mutate({
        integrationId,
        dataStreamId: dataStreamDeleteTarget.dataStreamId,
      });
    }
  };

  const handleDeleteCancel = () => {
    setDataStreamDeleteTarget(null);
  };

  const dataStreamColumns: Array<EuiBasicTableColumn<DataStreamResponse>> = useMemo(() => {
    const tooltipStyles = {
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      color: euiTheme.colors.text,
      border: 'none',
    };

    return [
      {
        name: '',
        actions: [
          {
            name: 'Expand',
            description: 'Expand for details about this data stream',
            icon: 'expand',
            type: 'icon',
            'data-test-subj': 'expandDataStreamButton',
            onClick: () => {
              // TODO: Implement expand action
            },
            enabled: (item: DataStreamResponse) =>
              item.status === 'completed' && item.dataStreamId !== deletingDataStreamId,
          },
        ],
        width: '48px',
      },
      {
        field: 'title',
        name: 'Title',
        sortable: true,
        render: (title: DataStreamResponse['title']) => (
          <EuiToolTip
            content={title}
            anchorClassName="eui-textTruncate"
            css={tooltipStyles}
            position="top"
          >
            <span tabIndex={0}>{title}</span>
          </EuiToolTip>
        ),
      },
      {
        field: 'inputTypes',
        name: 'Data Collection Methods',
        sortable: true,
        render: (inputTypes: DataStreamResponse['inputTypes']) => (
          <InputTypesBadges inputTypes={inputTypes} />
        ),
        css: css`
          max-width: 200px;
        `,
      },
      {
        field: 'status',
        name: 'Status',
        sortable: true,
        render: (status: DataStreamResponse['status'], item: DataStreamResponse) => (
          <Status status={status} isDeleting={item.dataStreamId === deletingDataStreamId} />
        ),
        width: '120px',
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'Refresh',
            description: 'Refresh this data stream',
            icon: 'refresh',
            type: 'icon',
            'data-test-subj': 'refreshDataStreamButton',
            onClick: () => {
              // TODO: Implement refresh action
              // run analyze operation with same data stream I think. Have to check if I have to delete existing
            },
            enabled: (item: DataStreamResponse) =>
              (item.status === 'completed' || item.status === 'failed') &&
              item.dataStreamId !== deletingDataStreamId,
          },
          {
            name: 'Delete',
            description: 'Delete this data stream',
            icon: 'trash',
            type: 'icon',
            color: 'danger',
            'data-test-subj': 'deleteDataStreamButton',
            onClick: (item: DataStreamResponse) => {
              setDataStreamDeleteTarget(item);
            },
            enabled: (item: DataStreamResponse) => item.dataStreamId !== deletingDataStreamId,
          },
        ],
        width: '80px',
      },
    ];
  }, [deletingDataStreamId, euiTheme]);

  return (
    <>
      <EuiBasicTable<DataStreamResponse>
        items={sortedItems}
        columns={dataStreamColumns}
        tableLayout="auto"
        tableCaption={i18n.DATA_STREAMS_TITLE}
        sorting={sorting}
        onChange={onTableChange}
      />
      {dataStreamDeleteTarget && (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          title={`Are you sure you want to delete "${dataStreamDeleteTarget.title}"?`}
          titleProps={{ id: deleteModalTitleId }}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          defaultFocusedButton="confirm"
          buttonColor="danger"
        />
      )}
    </>
  );
};

DataStreamsTable.displayName = 'DataStreamsTable';
