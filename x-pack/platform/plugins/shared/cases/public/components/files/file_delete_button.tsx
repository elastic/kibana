/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import * as i18n from './translations';
import { useDeleteFileAttachment } from '../../containers/use_delete_file_attachment';
import { useDeletePropertyAction } from '../user_actions/property_actions/use_delete_property_action';
import { DeleteAttachmentConfirmationModal } from '../user_actions/delete_attachment_confirmation_modal';
import { useCasesContext } from '../cases_context/use_cases_context';

interface FileDeleteButtonProps {
  caseId: string;
  fileId: string;
  isIcon?: boolean;
}

const FileDeleteButtonComponent: React.FC<FileDeleteButtonProps> = ({ caseId, fileId, isIcon }) => {
  const { permissions } = useCasesContext();
  const { isLoading, mutate: deleteFileAttachment } = useDeleteFileAttachment();

  const { showDeletionModal, onModalOpen, onConfirm, onCancel } = useDeletePropertyAction({
    onDelete: () => deleteFileAttachment({ caseId, fileId }),
  });

  const buttonProps = {
    iconType: 'trash',
    'aria-label': i18n.DELETE_FILE,
    color: 'danger' as const,
    isDisabled: isLoading,
    onClick: onModalOpen,
    'data-test-subj': 'cases-files-delete-button',
  };

  return permissions.delete ? (
    <>
      {isIcon ? (
        <EuiButtonIcon {...buttonProps} />
      ) : (
        <EuiButtonEmpty {...buttonProps}>{i18n.DELETE_FILE}</EuiButtonEmpty>
      )}
      {showDeletionModal ? (
        <DeleteAttachmentConfirmationModal
          title={i18n.DELETE_FILE_TITLE}
          confirmButtonText={i18n.DELETE}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      ) : null}
    </>
  ) : (
    <></>
  );
};
FileDeleteButtonComponent.displayName = 'FileDeleteButton';

export const FileDeleteButton = React.memo(FileDeleteButtonComponent);
