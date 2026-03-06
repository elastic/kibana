/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

export interface Props {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelButtonText?: string;
  confirmButtonText?: string;
  className?: string;
}

export const ConfirmModal: FunctionComponent<Props> = ({
  isOpen,
  title = 'Confirm',
  message,
  onConfirm,
  onCancel,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  className,
  ...rest
}) => {
  const modalTitleId = useGeneratedHtmlId();

  // render nothing if this component isn't open
  if (!isOpen) {
    return null;
  }

  return (
    <EuiConfirmModal
      {...rest}
      className={`canvasConfirmModal ${className || ''}`}
      title={title}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={confirmButtonText}
      cancelButtonText={cancelButtonText}
      defaultFocusedButton="confirm"
      buttonColor="danger"
      data-test-subj="canvasConfirmModal"
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
    >
      {message}
    </EuiConfirmModal>
  );
};
