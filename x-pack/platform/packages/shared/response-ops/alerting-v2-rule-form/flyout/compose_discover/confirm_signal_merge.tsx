/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const MODAL_TITLE = i18n.translate('xpack.alertingV2.composeDiscover.signalMergeModal.title', {
  defaultMessage: 'Combine query into one block?',
});

const MODAL_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.composeDiscover.signalMergeModal.description',
  {
    defaultMessage:
      'Signal rules store a single query. Switching to Signal will combine your base query and alert condition into one query block. This cannot be undone automatically.',
  }
);

const CONFIRM_BUTTON = i18n.translate('xpack.alertingV2.composeDiscover.signalMergeModal.confirm', {
  defaultMessage: 'Combine and switch',
});

const CANCEL_BUTTON = i18n.translate('xpack.alertingV2.composeDiscover.signalMergeModal.cancel', {
  defaultMessage: 'Cancel',
});

export interface ConfirmSignalMergeProps {
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Shown when the user switches Mode to Signal while the committed query is
 * still split (composed). Confirm merges to a standalone query and switches
 * kind; cancel leaves both mode and the split untouched.
 */
export const ConfirmSignalMerge = ({ onCancel, onConfirm }: ConfirmSignalMergeProps) => (
  <EuiConfirmModal
    onCancel={onCancel}
    onConfirm={onConfirm}
    data-test-subj="alertingV2ConfirmSignalMergeModal"
    defaultFocusedButton="cancel"
    title={MODAL_TITLE}
    confirmButtonText={CONFIRM_BUTTON}
    cancelButtonText={CANCEL_BUTTON}
  >
    <EuiText>
      <p>{MODAL_DESCRIPTION}</p>
    </EuiText>
  </EuiConfirmModal>
);
