/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import { useGetUserInstructions } from '../../hooks/use_get_user_instructions';
import { useCreateKnowledgeBaseUserInstruction } from '../../hooks/use_create_knowledge_base_user_instruction';
import { useDeleteKnowledgeBaseEntry } from '../../hooks/use_delete_knowledge_base_entry';

export function KnowledgeBaseEditUserInstructionFlyout({ onClose }: { onClose: () => void }) {
  const [newEntryText, setNewEntryText] = useState('');
  const [newEntryId, setNewEntryId] = useState<string>();

  const { userInstructions, isLoading: isFetching } = useGetUserInstructions();
  const { mutateAsync: createOrUpdateEntry, isLoading: isSaving } =
    useCreateKnowledgeBaseUserInstruction();
  const { mutate: deleteEntry } = useDeleteKnowledgeBaseEntry();

  useEffect(() => {
    const userInstruction = userInstructions?.find((entry) => !entry.public);
    setNewEntryText(userInstruction?.text ?? '');
    setNewEntryId(userInstruction?.id);
  }, [userInstructions]);

  const handleSubmit = async () => {
    if (newEntryId && !newEntryText) {
      deleteEntry({ id: newEntryId, isUserInstruction: true });
    } else {
      await createOrUpdateEntry({
        entry: {
          id: newEntryId ?? uuidv4(),
          text: newEntryText,
          public: false, // limit user instructions to private (for now)
        },
      });
    }

    onClose();
  };

  const flyoutTitleId = useGeneratedHtmlId();

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder data-test-subj="knowledgeBaseManualEntryFlyout">
        <EuiTitle>
          <h2 id={flyoutTitleId}>
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.knowledgeBaseEditSystemPrompt.h2.editEntryLabel',
              { defaultMessage: 'User-specific System Prompt' }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText>
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseEditSystemPromptFlyout.personalPromptTextLabel',
            {
              defaultMessage:
                'This user-specific prompt will be appended to the system prompt. It is space-aware and will only be used for your prompts - not shared with other users.',
            }
          )}
        </EuiText>

        <EuiSpacer size="s" />

        <EuiFormRow fullWidth>
          <EuiMarkdownEditor
            editorId="knowledgeBaseEditManualEntryFlyoutMarkdownEditor"
            aria-label={i18n.translate(
              'xpack.observabilityAiAssistantManagement.knowledgeBaseNewManualEntryFlyout.euiMarkdownEditor.observabilityAiAssistantKnowledgeBaseViewMarkdownEditorLabel',
              { defaultMessage: 'observabilityAiAssistantKnowledgeBaseViewMarkdownEditor' }
            )}
            height={300}
            initialViewMode="editing"
            readOnly={isFetching}
            placeholder={i18n.translate(
              'xpack.observabilityAiAssistantManagement.knowledgeBaseEditManualEntryFlyout.euiMarkdownEditor.enterContentsLabel',
              { defaultMessage: 'Enter contents' }
            )}
            value={newEntryText}
            onChange={(text) => setNewEntryText(text)}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="knowledgeBaseEditManualEntryFlyoutCancelButton"
              disabled={isSaving}
              onClick={onClose}
            >
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.knowledgeBaseNewManualEntryFlyout.cancelButtonEmptyLabel',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="knowledgeBaseEditManualEntryFlyoutSaveButton"
              fill
              isLoading={isSaving}
              onClick={handleSubmit}
            >
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.knowledgeBaseNewManualEntryFlyout.saveButtonLabel',
                { defaultMessage: 'Save' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}