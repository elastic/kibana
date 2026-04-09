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
      <EuiModal
        onClose={onCancel}
        aria-label={i18n.translate('xpack.queryActivity.stopQueryConfirmationModal.ariaLabel', {
          defaultMessage: 'Cancel query confirmation',
        })}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.translate('xpack.queryActivity.stopQueryConfirmationModal.title', {
              defaultMessage: 'Cancel this query?',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>
            <p>
              {i18n.translate('xpack.queryActivity.stopQueryConfirmationModal.body', {
                defaultMessage:
                  'Canceling this query can’t be undone. It can take a few seconds before the query stops.',
              })}
            </p>
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel} disabled={isLoading}>
            {i18n.translate('xpack.queryActivity.stopQueryConfirmationModal.cancelButton', {
              defaultMessage: 'Let the query run',
            })}
          </EuiButtonEmpty>

          <EuiButton color="danger" fill onClick={onConfirm} isLoading={isLoading}>
            {i18n.translate('xpack.queryActivity.stopQueryConfirmationModal.confirmButton', {
              defaultMessage: 'Cancel the query',
            })}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
