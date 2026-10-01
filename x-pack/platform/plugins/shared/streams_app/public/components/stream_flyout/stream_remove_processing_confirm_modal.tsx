/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiSwitch, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

interface StreamRemoveProcessingConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export function StreamRemoveProcessingConfirmationModal({
  onClose,
  onConfirm,
}: StreamRemoveProcessingConfirmationModalProps) {
  const modalTitleId = useGeneratedHtmlId();
  const [confirmation, setConfirmation] = useState(false);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.translate('xpack.streams.flyout.euiConfirmModal.deleteLabel', {
        defaultMessage: 'Remove processing?',
      })}
      titleProps={{ id: modalTitleId }}
      cancelButtonText={i18n.translate('xpack.streams.flyout.euiConfirmModal.cancelLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.streams.flyout.euiConfirmModal.confirmLabel', {
        defaultMessage: 'Confirm removal',
      })}
      confirmButtonDisabled={!confirmation}
      onCancel={onClose}
      onConfirm={onConfirm}
    >
      <>
        <p>
          {i18n.translate('xpack.streams.flyout.euiConfirmModal.content', {
            defaultMessage:
              "Any unsaved changes that you have made will be removed as well. This can't be undone",
          })}
        </p>
        <EuiSwitch
          label={i18n.translate('xpack.streams.flyout.confirmation.label', {
            defaultMessage: "I understand this removes any changes present and can't be undone",
          })}
          checked={confirmation}
          onChange={() => setConfirmation(!confirmation)}
        />
      </>
    </EuiConfirmModal>
  );
}
