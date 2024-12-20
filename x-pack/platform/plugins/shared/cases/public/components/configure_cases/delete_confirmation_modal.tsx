/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import * as i18n from '../custom_fields/translations';

interface ConfirmDeleteCaseModalProps {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationModalComponent: React.FC<ConfirmDeleteCaseModalProps> = ({
  title,
  message,
  onCancel,
  onConfirm,
}) => {
  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={i18n.CANCEL}
      data-test-subj="confirm-delete-modal"
      defaultFocusedButton="confirm"
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={title}
      confirmButtonText={i18n.DELETE}
    >
      {message}
    </EuiConfirmModal>
  );
};
DeleteConfirmationModalComponent.displayName = 'DeleteConfirmationModal';

export const DeleteConfirmationModal = React.memo(DeleteConfirmationModalComponent);
