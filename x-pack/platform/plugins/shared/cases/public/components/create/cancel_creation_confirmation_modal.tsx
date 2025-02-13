/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiConfirmModalProps } from '@elastic/eui';
import { EuiConfirmModal } from '@elastic/eui';
import * as i18n from './translations';

type Props = Pick<
  EuiConfirmModalProps,
  'title' | 'confirmButtonText' | 'cancelButtonText' | 'onConfirm' | 'onCancel'
>;

const CancelCreationConfirmationModalComponent: React.FC<Props> = ({
  title,
  confirmButtonText = i18n.CONFIRM_MODAL_BUTTON,
  cancelButtonText = i18n.CANCEL_MODAL_BUTTON,
  onConfirm,
  onCancel,
}) => {
  return (
    <EuiConfirmModal
      title={title}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={cancelButtonText}
      confirmButtonText={confirmButtonText}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      data-test-subj="cancel-creation-confirmation-modal"
    />
  );
};

CancelCreationConfirmationModalComponent.displayName = 'CancelCreationConfirmationModal';

export const CancelCreationConfirmationModal = React.memo(CancelCreationConfirmationModalComponent);
