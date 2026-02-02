/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiBasicTable,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataStreamResponse } from '../../../../../../common';
import * as i18n from '../translations';
import { useDeleteDataStream } from '../../../../../common';

const LINE_CLAMP = 1;
const getLineClampedCss = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
`;

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
            enabled: () => true,
          },
        ],
        width: '48px',
      },
      {
        field: 'title',
        name: 'Title',
        sortable: true,
        width: '200px',
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
        render: (inputTypes: DataStreamResponse['inputTypes']) => {
          if (inputTypes != null && inputTypes.length > 0) {
            const clampedBadges = (
              <EuiBadgeGroup
                data-test-subj="input-types-table-column-tags"
                gutterSize="none"
                css={getLineClampedCss}
              >
                {inputTypes.map((inputType, index) => (
                  <EuiBadge
                    key={`${inputType.name}`}
                    color="hollow"
                    css={{
                      borderRadius: '4px',
                      marginRight: index < inputTypes.length - 1 ? '4px' : 0,
                    }}
                    data-test-subj={`input-type-table-column-${inputType.name}`}
                  >
                    {inputType.name}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            const unclampedBadges = (
              <EuiBadgeGroup data-test-subj="input-types-table-column-types" gutterSize="xs">
                {inputTypes.map((inputType) => (
                  <EuiBadge
                    color="hollow"
                    css={{ borderRadius: '4px' }}
                    key={`${inputType.name}`}
                    data-test-subj={`input-type-table-column-${inputType.name}`}
                  >
                    {inputType.name}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );
            return (
              <EuiToolTip
                data-test-subj="case-table-column-tags-tooltip"
                css={tooltipStyles}
                content={unclampedBadges}
              >
                {clampedBadges}
              </EuiToolTip>
            );
          }
          return null;
        },
      },
      {
        field: 'status',
        name: 'Status',
        sortable: true,
        render: (status: DataStreamResponse['status'], item: DataStreamResponse) => {
          const isDeleting = item.dataStreamId === deletingDataStreamId;

          if (isDeleting) {
            return (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">Deleting...</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }

          const statusColorMap: Record<DataStreamResponse['status'], string> = {
            pending: 'default',
            processing: 'primary',
            completed: 'success',
            failed: 'danger',
            cancelled: 'warning',
          };
          const statusIconMap: Record<DataStreamResponse['status'], string> = {
            pending: '',
            processing: '',
            completed: 'dot',
            failed: 'cross',
            cancelled: 'minusInCircle',
          };
          const statusTextMap: Record<DataStreamResponse['status'], string> = {
            pending: 'Analyzing',
            processing: 'Analyzing',
            completed: 'Success',
            failed: 'Failed',
            cancelled: 'Cancelled',
          };
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                {status === 'pending' || status === 'processing' ? (
                  <EuiLoadingSpinner size="s" />
                ) : (
                  <EuiIcon type={statusIconMap[status]} color={statusColorMap[status]} />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{statusTextMap[status]}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
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
        items={items}
        columns={dataStreamColumns}
        tableLayout="fixed"
        tableCaption={i18n.DATA_STREAMS_TITLE}
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
