/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useDeletePrompt } from '../../hooks/prompts/use_delete_prompt';
import { labels } from '../../utils/i18n';

export interface DeletePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  promptName: string;
}

export const DeletePromptModal: React.FC<DeletePromptModalProps> = ({
  isOpen,
  onClose,
  promptId,
  promptName,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId({ prefix: 'deletePromptModal' });

  const { deletePrompt, isLoading } = useDeletePrompt({
    onSuccess: () => {
      onClose();
    },
  });

  const handleConfirm = () => {
    deletePrompt(promptId);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <EuiConfirmModal
      maxWidth="400px"
      aria-labelledby={confirmModalTitleId}
      title={labels.prompts.deleteModalTitle(promptName)}
      titleProps={{ id: confirmModalTitleId }}
      onCancel={onClose}
      onConfirm={handleConfirm}
      cancelButtonText={labels.prompts.deleteModalCancelButton}
      confirmButtonText={labels.prompts.deleteModalConfirmButton}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      isLoading={isLoading}
    >
      <p>
        <FormattedMessage
          id="xpack.agentBuilder.prompts.deleteModal.description"
          defaultMessage="Are you sure you want to delete the prompt {name}? This action cannot be undone."
          values={{
            name: <strong>{promptName}</strong>,
          }}
        />
      </p>
    </EuiConfirmModal>
  );
};
