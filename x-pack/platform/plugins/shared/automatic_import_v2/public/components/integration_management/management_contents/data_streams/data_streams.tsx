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
import { useUIState } from '../../contexts';
import { CreateDataStreamFlyout } from './create_data_stream_flyout';
import * as i18n from './translations';

export const DataStreams = () => {
  const { isCreateDataStreamFlyoutOpen, openCreateDataStreamFlyout, closeCreateDataStreamFlyout } =
    useUIState();

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
              <EuiButton
                iconType="plusInCircle"
                onClick={openCreateDataStreamFlyout}
                data-test-subj="addDataStreamButton"
              >
                {i18n.ADD_DATA_STREAM_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="m" />
      {/* zero state */}
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiFlexItem grow={false} />
      </EuiFlexGroup>

      {isCreateDataStreamFlyoutOpen && (
        <CreateDataStreamFlyout onClose={closeCreateDataStreamFlyout} />
      )}
    </>
  );
};

DataStreams.displayName = 'DataStreams';
