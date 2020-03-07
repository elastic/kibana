/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import * as i18n from './translations';

interface ConfirmDeleteCaseModalProps {
  caseTitle: string;
  isModalVisible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteCaseModalComp: React.FC<ConfirmDeleteCaseModalProps> = ({
  caseTitle,
  isModalVisible,
  onCancel,
  onConfirm,
}) => {
  if (!isModalVisible) {
    return null;
  }
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        cancelButtonText={i18n.CANCEL}
        confirmButtonText={i18n.DELETE_CASE}
        defaultFocusedButton="confirm"
        onCancel={onCancel}
        onConfirm={onConfirm}
        title={i18n.DELETE_TITLE(caseTitle)}
      >
        {i18n.CONFIRM_QUESTION}
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};

export const ConfirmDeleteCaseModal = React.memo(ConfirmDeleteCaseModalComp);
