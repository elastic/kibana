/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { DataStreamResponse } from '../../../../../common/model/common_attributes.gen';
import { useUIState } from '../../contexts';
import { CreateDataStreamFlyout } from './create_data_stream_flyout';
import * as i18n from './translations';
import { useGetIntegrationById } from '../../../../common';

export const DataStreams = React.memo<{ integrationId?: string }>(() => {
  const { isCreateDataStreamFlyoutOpen, openCreateDataStreamFlyout, closeCreateDataStreamFlyout } =
    useUIState();
  const { integrationId } = useParams<{ integrationId?: string }>();
  const { integration } = useGetIntegrationById(integrationId);

  const hasDataStreams = (integration?.dataStreams?.length ?? 0) > 0;

  const dataStreamColumns: Array<EuiBasicTableColumn<DataStreamResponse>> = useMemo(
    () => [
      {
        field: 'title',
        name: 'Title',
        sortable: true,
        truncateText: true,
      },
      {
        field: 'dataStreamId',
        name: 'Name',
        sortable: true,
        truncateText: true,
      },
      {
        field: 'inputTypes',
        name: 'Data Collection Methods',
        render: (inputTypes: DataStreamResponse['inputTypes']) => (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {inputTypes.map((inputType) => (
              <EuiFlexItem grow={false} key={inputType.name}>
                <EuiBadge color="hollow">{inputType.name}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'status',
        name: 'Status',
        sortable: true,
        render: (status: DataStreamResponse['status']) => {
          const statusColorMap: Record<DataStreamResponse['status'], string> = {
            pending: 'default',
            processing: 'primary',
            completed: 'success',
            failed: 'danger',
            cancelled: 'warning',
          };
          return <EuiBadge color={statusColorMap[status]}>{status}</EuiBadge>;
        },
      },
    ],
    []
  );

  return (
    <>
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.DATA_STREAMS_DESCRIPTION}
          </EuiText>

          <EuiSpacer size="m" />
          <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{i18n.DATA_STREAMS_TITLE}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {hasDataStreams && (
                <EuiButton
                  iconType="plusInCircle"
                  onClick={openCreateDataStreamFlyout}
                  data-test-subj="addDataStreamButton"
                >
                  {i18n.ADD_DATA_STREAM_BUTTON}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="m" />

      {!hasDataStreams && (
        <EuiFlexGroup direction="column" alignItems="center">
          <EuiText size="s" color="subdued">
            {i18n.ZERO_STATE_DESCRIPTION}
          </EuiText>
          <EuiFlexItem grow={false}>
            {' '}
            <EuiButton
              iconType="plusInCircle"
              onClick={openCreateDataStreamFlyout}
              data-test-subj="addDataStreamButton"
            >
              {i18n.ADD_DATA_STREAM_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {hasDataStreams && integration?.dataStreams && (
        <EuiBasicTable<DataStreamResponse>
          items={integration.dataStreams}
          columns={dataStreamColumns}
          tableLayout="auto"
          tableCaption={i18n.DATA_STREAMS_TITLE}
        />
      )}

      {isCreateDataStreamFlyoutOpen && (
        <CreateDataStreamFlyout onClose={closeCreateDataStreamFlyout} />
      )}
    </>
  );
});

DataStreams.displayName = 'DataStreams';
