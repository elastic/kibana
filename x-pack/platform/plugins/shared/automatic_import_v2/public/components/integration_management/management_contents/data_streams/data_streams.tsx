/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import { useUIState } from '../../contexts';
import { CreateDataStreamFlyout } from './create_data_stream_flyout';
import * as i18n from './translations';
import { useGetIntegrationById } from '../../../../common';
import { DataStreamsTable } from './data_streams_table/data_steams_table';
import { EditPipelineFlyout } from './edit_pipeline_flyout';

export const DataStreams = React.memo<{ integrationId?: string }>(() => {
  const {
    isCreateDataStreamFlyoutOpen,
    openCreateDataStreamFlyout,
    closeCreateDataStreamFlyout,
    isEditPipelineFlyoutOpen,
    selectedDataStream,
    closeEditPipelineFlyout,
  } = useUIState();
  const { integrationId } = useParams<{ integrationId?: string }>();
  const { integration } = useGetIntegrationById(integrationId);

  const hasDataStreams = (integration?.dataStreams?.length ?? 0) > 0;

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

      {hasDataStreams && integration?.dataStreams && integrationId && (
        <DataStreamsTable integrationId={integrationId} items={integration.dataStreams} />
      )}

      {isCreateDataStreamFlyoutOpen && (
        <CreateDataStreamFlyout onClose={closeCreateDataStreamFlyout} />
      )}

      {isEditPipelineFlyoutOpen && selectedDataStream && integrationId && (
        <EditPipelineFlyout
          integrationId={integrationId}
          dataStream={selectedDataStream}
          onClose={closeEditPipelineFlyout}
        />
      )}
    </>
  );
});

DataStreams.displayName = 'DataStreams';
