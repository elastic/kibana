/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import type {
  CreateUserPromptPayload,
  UpdateUserPromptPayload,
} from '../../../../common/http_api/user_prompts';
import { useCreatePrompt } from '../../hooks/prompts/use_create_prompt';
import { usePrompt } from '../../hooks/prompts/use_prompt';
import { useUpdatePrompt } from '../../hooks/prompts/use_update_prompt';
import { labels } from '../../utils/i18n';

export interface PromptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId?: string; // If provided, we're editing; otherwise, creating
}

export const PromptFormModal: React.FC<PromptFormModalProps> = ({ isOpen, onClose, promptId }) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'promptFormModalTitle' });
  const isEditMode = !!promptId;

  const { prompt, isLoading: isLoadingPrompt } = usePrompt({
    promptId,
    onLoadingError: () => {
      onClose();
    },
  });

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  // Reset form when modal opens/closes or prompt data loads
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && prompt) {
        setId(prompt.id);
        setName(prompt.name);
        setContent(prompt.content);
      } else {
        // Reset form for create mode
        setId('');
        setName('');
        setContent('');
      }
    }
  }, [isOpen, isEditMode, prompt]);

  const { createPrompt, isLoading: isCreating } = useCreatePrompt({
    onSuccess: () => {
      onClose();
    },
  });

  const { updatePrompt, isLoading: isUpdating } = useUpdatePrompt({
    onSuccess: () => {
      onClose();
    },
  });

  const isLoading = isCreating || isUpdating || (isEditMode && isLoadingPrompt);
  const isFormValid = isEditMode
    ? name.trim() !== '' && content.trim() !== ''
    : id.trim() !== '' && name.trim() !== '' && content.trim() !== '';

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) {
      return;
    }

    if (isEditMode && promptId) {
      const payload: UpdateUserPromptPayload = {
        ...(name !== prompt?.name && { name }),
        ...(content !== prompt?.content && { content }),
      };
      await updatePrompt({ promptId, payload });
    } else {
      const payload: CreateUserPromptPayload = {
        id,
        name,
        content,
      };
      await createPrompt(payload);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId} maxWidth={600}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {isEditMode ? (
            <FormattedMessage
              id="xpack.agentBuilder.prompts.editModal.title"
              defaultMessage="Edit prompt"
            />
          ) : (
            <FormattedMessage
              id="xpack.agentBuilder.prompts.createModal.title"
              defaultMessage="Create prompt"
            />
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm component="form">
          <EuiFormRow
            label={labels.prompts.idLabel}
            fullWidth
            helpText={
              isEditMode ? (
                <FormattedMessage
                  id="xpack.agentBuilder.prompts.editModal.idHelpText"
                  defaultMessage="ID cannot be changed when editing"
                />
              ) : undefined
            }
          >
            <EuiFieldText
              fullWidth
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={isEditMode || isLoading}
              placeholder={labels.prompts.idPlaceholder}
              data-test-subj="promptFormModalIdInput"
            />
          </EuiFormRow>
          <EuiFormRow label={labels.prompts.nameLabel} fullWidth>
            <EuiFieldText
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder={labels.prompts.namePlaceholder}
              data-test-subj="promptFormModalNameInput"
            />
          </EuiFormRow>
          <EuiFormRow label={labels.prompts.contentLabel} fullWidth>
            <EuiTextArea
              fullWidth
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading}
              placeholder={labels.prompts.contentPlaceholder}
              rows={6}
              data-test-subj="promptFormModalContentInput"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isLoading}>
          <FormattedMessage
            id="xpack.agentBuilder.prompts.formModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          onClick={handleSubmit}
          fill
          isLoading={isLoading}
          isDisabled={!isFormValid || isLoading}
          data-test-subj="promptFormModalSubmitButton"
        >
          {isEditMode ? (
            <FormattedMessage
              id="xpack.agentBuilder.prompts.formModal.updateButton"
              defaultMessage="Update"
            />
          ) : (
            <FormattedMessage
              id="xpack.agentBuilder.prompts.formModal.createButton"
              defaultMessage="Create"
            />
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
