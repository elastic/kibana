/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const MODAL_TITLE = i18n.translate('xpack.alertingV2.ruleForm.cancelModal.title', {
  defaultMessage: 'Discard unsaved changes to rule?',
});

const MODAL_DESCRIPTION = i18n.translate('xpack.alertingV2.ruleForm.cancelModal.description', {
  defaultMessage: "You can't recover unsaved changes.",
});

const CONFIRM_BUTTON = i18n.translate('xpack.alertingV2.ruleForm.cancelModal.confirm', {
  defaultMessage: 'Discard changes',
});

const CANCEL_BUTTON = i18n.translate('xpack.alertingV2.ruleForm.cancelModal.cancel', {
  defaultMessage: 'Continue editing',
});

export interface ConfirmRuleCloseProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmRuleClose = ({ onCancel, onConfirm }: ConfirmRuleCloseProps) => (
  <EuiConfirmModal
    onCancel={onCancel}
    onConfirm={onConfirm}
    data-test-subj="alertingV2ConfirmRuleCloseModal"
    buttonColor="danger"
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
