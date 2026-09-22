/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import * as i18n from '../translations';

interface TemplateResetModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const TemplateResetModal: React.FC<TemplateResetModalProps> = ({ onCancel, onConfirm }) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      title={i18n.REVERT_MODAL_TITLE}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.REVERT_MODAL_CANCEL}
      confirmButtonText={i18n.REVERT_MODAL_CONFIRM}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
    >
      {i18n.REVERT_MODAL_BODY}
    </EuiConfirmModal>
  );
};

TemplateResetModal.displayName = 'TemplateResetModal';
