/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiConfirmModalProps } from '@elastic/eui';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { CANCEL_BUTTON } from './property_actions/translations';
import { useFocusButtonTrap } from '../use_focus_button';

type Props = Pick<
  EuiConfirmModalProps,
  'title' | 'confirmButtonText' | 'onConfirm' | 'onCancel'
> & {
  /**
   * The ref of the button to focus when the modal is closed
   */
  focusButtonRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
};

const DeleteAttachmentConfirmationModalComponent: React.FC<Props> = ({
  title,
  confirmButtonText,
  onConfirm,
  onCancel,
  focusButtonRef,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const focusTrapProps = useFocusButtonTrap(focusButtonRef);

  return (
    <EuiConfirmModal
      title={title}
      titleProps={{
        id: modalTitleId,
      }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={CANCEL_BUTTON}
      confirmButtonText={confirmButtonText}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      data-test-subj="property-actions-confirm-modal"
      aria-labelledby={modalTitleId}
      focusTrapProps={focusTrapProps}
    />
  );
};

DeleteAttachmentConfirmationModalComponent.displayName = 'DeleteAttachmentConfirmationModal';

export const DeleteAttachmentConfirmationModal = React.memo(
  DeleteAttachmentConfirmationModalComponent
);
