/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { Streams } from '@kbn/streams-schema';

export const NoFailureStorePanel = ({
  openModal,
  definition,
}: {
  openModal: (show: boolean) => void;
  definition: Streams.ingest.all.GetResponse;
}) => {
  const {
    privileges: { manage_failure_store: manageFailureStorePrivilege },
  } = definition;
  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      color="subdued"
      grow={false}
      data-test-subj="disabledFailureStorePanel"
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiText>
            <b>
              {i18n.translate('xpack.streams.streamDetailView.failureStoreDisabled.title', {
                defaultMessage: 'Failure store disabled',
              })}
            </b>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText>
            {i18n.translate('xpack.streams.streamDetailView.failureStoreDisabled.description', {
              defaultMessage:
                'Enable the failure store to have this stream’s failed documents automatically placed',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {manageFailureStorePrivilege && !Streams.WiredStream.GetResponse.is(definition) && (
            <div>
              <EuiButton
                type="button"
                onClick={() => openModal(true)}
                data-test-subj="streamsAppFailureStoreEnableButton"
              >
                {i18n.translate('xpack.streams.streamDetailView.failureStoreDisabled.button', {
                  defaultMessage: 'Enable failure store',
                })}
              </EuiButton>
            </div>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
