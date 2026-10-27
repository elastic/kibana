/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface KiDiscardEditsConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export const KiDiscardEditsConfirmModal = ({
  onClose,
  onConfirm,
}: KiDiscardEditsConfirmModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.contextEngine.viewKi.discardEditsModal.title', {
        defaultMessage: 'Discard unsaved changes?',
      })}
      onCancel={onClose}
      onConfirm={onConfirm}
      buttonColor="danger"
      defaultFocusedButton="cancel"
      cancelButtonText={i18n.translate(
        'xpack.contextEngine.viewKi.discardEditsModal.cancelButton',
        {
          defaultMessage: 'Keep editing',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.contextEngine.viewKi.discardEditsModal.confirmButton',
        {
          defaultMessage: 'Discard',
        }
      )}
      data-test-subj="contextViewKiDiscardEditsConfirmModal"
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.contextEngine.viewKi.discardEditsModal.body"
            defaultMessage="Your edits to this Knowledge Indicator will be lost."
          />
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
