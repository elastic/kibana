/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiFlyoutResizableProps } from '@elastic/eui';
import { EuiConfirmModal, EuiText } from '@elastic/eui';
import {
  RULE_FORM_CANCEL_MODAL_TITLE,
  RULE_FORM_CANCEL_MODAL_DESCRIPTION,
  RULE_FORM_CANCEL_MODAL_CONFIRM,
  RULE_FORM_CANCEL_MODAL_CANCEL,
} from './translations';

export interface ConfirmRuleCloseProps {
  onCancel: () => void;
  onConfirm: () => void;
  focusTrapProps?: EuiFlyoutResizableProps['focusTrapProps'];
}

export const ConfirmRuleClose = ({
  onCancel,
  onConfirm,
  focusTrapProps,
}: ConfirmRuleCloseProps) => (
  <EuiConfirmModal
    onCancel={onCancel}
    onConfirm={onConfirm}
    data-test-subj="alertingV2ConfirmRuleCloseModal"
    buttonColor="danger"
    defaultFocusedButton="confirm"
    title={RULE_FORM_CANCEL_MODAL_TITLE}
    confirmButtonText={RULE_FORM_CANCEL_MODAL_CONFIRM}
    cancelButtonText={RULE_FORM_CANCEL_MODAL_CANCEL}
    aria-label={RULE_FORM_CANCEL_MODAL_TITLE}
    focusTrapProps={focusTrapProps}
  >
    <EuiText>
      <p>{RULE_FORM_CANCEL_MODAL_DESCRIPTION}</p>
    </EuiText>
  </EuiConfirmModal>
);
