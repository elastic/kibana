/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import * as i18n from './translations';
import { useFocusButtonTrap } from '../use_focus_button';

interface ConfirmDeleteCaseModalProps {
  totalCasesToBeDeleted: number;
  onCancel: () => void;
  onConfirm: () => void;
  focusButtonRef?: React.Ref<HTMLAnchorElement | HTMLButtonElement>;
}

const ConfirmDeleteCaseModalComp: React.FC<ConfirmDeleteCaseModalProps> = ({
  totalCasesToBeDeleted,
  onCancel,
  onConfirm,
  focusButtonRef,
}) => {
  const titleId = useGeneratedHtmlId();
  const focusTrapProps = useFocusButtonTrap(focusButtonRef);

  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={i18n.CANCEL}
      confirmButtonText={i18n.DELETE_CASE(totalCasesToBeDeleted)}
      data-test-subj="confirm-delete-case-modal"
      defaultFocusedButton="confirm"
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={i18n.DELETE_CASE(totalCasesToBeDeleted)}
      titleProps={{
        id: titleId,
      }}
      aria-labelledby={titleId}
      focusTrapProps={focusTrapProps}
    >
      {i18n.CONFIRM_QUESTION(totalCasesToBeDeleted)}
    </EuiConfirmModal>
  );
};
ConfirmDeleteCaseModalComp.displayName = 'ConfirmDeleteCaseModalComp';

export const ConfirmDeleteCaseModal = React.memo(ConfirmDeleteCaseModalComp);
