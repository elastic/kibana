/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface StopQueryConfirmationModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const StopQueryConfirmationModal: React.FC<StopQueryConfirmationModalProps> = ({
  onCancel,
  onConfirm,
  isLoading,
}) => {
  return (
    <EuiOverlayMask>
      <EuiModal onClose={onCancel}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.translate('xpack.runningQueries.stopQueryConfirmationModal.title', {
              defaultMessage: 'Are you sure you want to stop this query?',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>
            <p>
              {i18n.translate('xpack.runningQueries.stopQueryConfirmationModal.body', {
                defaultMessage:
                  'Stopping this query is an irreversible action. Are you sure you want to proceed?',
              })}
            </p>
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel} disabled={isLoading}>
            {i18n.translate('xpack.runningQueries.stopQueryConfirmationModal.cancelButton', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>

          <EuiButton color="danger" fill onClick={onConfirm} isLoading={isLoading}>
            {i18n.translate('xpack.runningQueries.stopQueryConfirmationModal.confirmButton', {
              defaultMessage: 'Confirm',
            })}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
