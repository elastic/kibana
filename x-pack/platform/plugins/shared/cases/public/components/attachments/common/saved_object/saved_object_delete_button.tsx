/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useDeleteComment } from '../../../../containers/use_delete_comment';
import { useDeletePropertyAction } from '../../../user_actions/property_actions/use_delete_property_action';
import { DeleteAttachmentConfirmationModal } from '../../../user_actions/delete_attachment_confirmation_modal';
import { DELETE_ATTACHMENT, DELETE } from '../../../user_actions/property_actions/translations';
import { DELETE_REGISTERED_ATTACHMENT } from '../../../user_actions/comment/translations';
import { useCasesContext } from '../../../cases_context/use_cases_context';

interface SavedObjectDeleteButtonProps {
  caseId: string;
  commentId: string;
}

const SavedObjectDeleteButtonComponent: React.FC<SavedObjectDeleteButtonProps> = ({
  caseId,
  commentId,
}) => {
  const { permissions } = useCasesContext();
  const { isLoading, mutate: deleteComment } = useDeleteComment();
  const { showDeletionModal, onModalOpen, onConfirm, onCancel } = useDeletePropertyAction({
    onDelete: () =>
      deleteComment({
        caseId,
        commentId,
        successToasterTitle: DELETE_REGISTERED_ATTACHMENT,
      }),
  });
  const buttonRef = React.useRef<HTMLAnchorElement>(null);

  if (!permissions.delete) {
    return null;
  }

  return (
    <>
      <EuiToolTip content={DELETE_ATTACHMENT} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="trash"
          aria-label={DELETE_ATTACHMENT}
          color="danger"
          isDisabled={isLoading}
          onClick={onModalOpen}
          data-test-subj={`cases-so-attachments-table-delete-${commentId}`}
          buttonRef={buttonRef}
        />
      </EuiToolTip>
      {showDeletionModal ? (
        <DeleteAttachmentConfirmationModal
          title={DELETE_ATTACHMENT}
          confirmButtonText={DELETE}
          onCancel={onCancel}
          onConfirm={onConfirm}
          focusButtonRef={buttonRef}
        />
      ) : null}
    </>
  );
};

SavedObjectDeleteButtonComponent.displayName = 'SavedObjectDeleteButton';

export const SavedObjectDeleteButton = React.memo(SavedObjectDeleteButtonComponent);
