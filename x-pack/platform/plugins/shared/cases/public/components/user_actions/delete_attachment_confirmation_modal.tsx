/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiConfirmModalProps } from '@elastic/eui';
import { EuiConfirmModal } from '@elastic/eui';
import { CANCEL_BUTTON } from './property_actions/translations';

type Pros = Pick<EuiConfirmModalProps, 'title' | 'confirmButtonText' | 'onConfirm' | 'onCancel'>;

const DeleteAttachmentConfirmationModalComponent: React.FC<Pros> = ({
  title,
  confirmButtonText,
  onConfirm,
  onCancel,
}) => {
  return (
    <EuiConfirmModal
      title={title}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={CANCEL_BUTTON}
      confirmButtonText={confirmButtonText}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      data-test-subj="property-actions-confirm-modal"
    />
  );
};

DeleteAttachmentConfirmationModalComponent.displayName = 'DeleteAttachmentConfirmationModal';

export const DeleteAttachmentConfirmationModal = React.memo(
  DeleteAttachmentConfirmationModalComponent
);
