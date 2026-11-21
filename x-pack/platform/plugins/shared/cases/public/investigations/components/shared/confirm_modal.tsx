/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import * as i18n from './translations';

export interface ConfirmModalProps {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use for destructive actions. */
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  'data-test-subj'?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  body,
  confirmLabel = i18n.CONFIRM_DEFAULT,
  cancelLabel = i18n.CANCEL,
  destructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
  'data-test-subj': dataTestSubj = 'investigationConfirmModal',
}) => (
  <EuiConfirmModal
    title={title}
    onConfirm={onConfirm}
    onCancel={onCancel}
    confirmButtonText={confirmLabel}
    cancelButtonText={cancelLabel}
    buttonColor={destructive ? 'danger' : 'primary'}
    isLoading={isLoading}
    defaultFocusedButton="cancel"
    aria-label={title}
    data-test-subj={dataTestSubj}
  >
    {body}
  </EuiConfirmModal>
);
ConfirmModal.displayName = 'ConfirmModal';
