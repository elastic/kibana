/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiIcon,
  copyToClipboard,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useCloudConnectedAppContext } from '../../../app_context';

interface DisconnectClusterModalProps {
  clusterName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export const DisconnectClusterModal: React.FC<DisconnectClusterModalProps> = ({
  clusterName,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const { telemetryService } = useCloudConnectedAppContext();
  const [confirmationText, setConfirmationText] = useState('');
  const isConfirmationValid = confirmationText === clusterName;

  const handleConfirm = async () => {
    if (isConfirmationValid) {
      await onConfirm();
      telemetryService.trackClusterDisconnected();
    }
  };

  return (
    <EuiModal onClose={onClose} maxWidth={650}>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="disconnectClusterModalTitle">
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.disconnect.modalTitle"
            defaultMessage="Disconnect cluster"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.cloudConnect.connectedServices.disconnect.warningTitle"
              defaultMessage="Disconnecting a cluster cannot be reversed"
            />
          }
          color="warning"
          iconType="warning"
          data-test-subj="disconnectClusterWarningCallout"
        >
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.cloudConnect.connectedServices.disconnect.warningDescription"
                defaultMessage="This action cannot be undone and permanently deletes connection with the cluster {clusterName}. If you proceed, your existing connected services will be disabled and you will lose any data within them."
                values={{
                  clusterName: (
                    <EuiLink
                      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                        e.currentTarget.blur();
                        copyToClipboard(clusterName);
                      }}
                      data-test-subj="disconnectClusterNameLink"
                    >
                      {clusterName} <EuiIcon type="copy" />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </EuiCallOut>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.cloudConnect.connectedServices.disconnect.confirmationLabel"
              defaultMessage="Type the cluster ID to confirm"
            />
          }
          fullWidth
        >
          <EuiFieldText
            placeholder={clusterName}
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={isLoading}
            fullWidth
            aria-label={i18n.translate(
              'xpack.cloudConnect.connectedServices.disconnect.confirmationInputAriaLabel',
              {
                defaultMessage: 'Type the cluster ID to confirm disconnection',
              }
            )}
            data-test-subj="disconnectClusterConfirmationInput"
          />
        </EuiFormRow>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          disabled={isLoading}
          data-test-subj="disconnectClusterCancelButton"
        >
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.disconnect.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          color="danger"
          fill
          onClick={handleConfirm}
          disabled={!isConfirmationValid || isLoading}
          isLoading={isLoading}
          data-test-subj="disconnectClusterConfirmButton"
        >
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.disconnect.confirmButton"
            defaultMessage="Disconnect cluster"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
