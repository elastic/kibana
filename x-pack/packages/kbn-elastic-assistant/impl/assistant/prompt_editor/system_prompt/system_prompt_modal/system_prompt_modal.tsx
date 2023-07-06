/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTextArea,
  EuiCheckbox,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { Conversation, Prompt } from '../../../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../../../assistant_context';
import { ConversationMultiSelector } from './conversation_multi_selector/conversation_multi_selector';
import {
  SYSTEM_PROMPT_SELECTOR_CLASSNAME,
  SystemPromptSelector,
} from './system_prompt_selector/system_prompt_selector';
import { TEST_IDS } from '../../../constants';

const StyledEuiModal = styled(EuiModal)`
  min-width: 400px;
  max-width: 400px;
  max-height: 80vh;
`;

interface Props {
  systemPrompts: Prompt[];
  onClose: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  onSystemPromptsChange: (systemPrompts: Prompt[], newConversation?: Conversation[]) => void;
}

/**
 * Modal for adding/removing system prompts. Configure name, prompt and default conversations.
 */
export const SystemPromptModal: React.FC<Props> = React.memo(
  ({ systemPrompts, onClose, onSystemPromptsChange }) => {
    const { conversations } = useAssistantContext();
    // Local state for quick prompts (returned to parent on save via onSystemPromptsChange())
    const [updatedSystemPrompts, setUpdatedSystemPrompts] = useState<Prompt[]>(systemPrompts);

    // Form options
    const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<Prompt>();
    // Prompt
    const [prompt, setPrompt] = useState('');
    const handlePromptTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
    }, []);
    // Conversations this system prompt should be a default for
    const [selectedConversations, setSelectedConversations] = useState<Conversation[]>([]);

    const onConversationSelectionChange = useCallback(
      (currentPromptConversations: Conversation[]) => {
        setSelectedConversations(currentPromptConversations);
      },
      []
    );

    /*
     * updatedConversationWithPrompts calculates the present of prompt for
     * each conversation. Based on the values of selected conversation, it goes
     * through each conversation adds/removed the selected prompt on each conversation.
     *
     * */
    const getUpdatedConversationWithPrompts = useCallback(() => {
      const currentPromptConversationIds = selectedConversations.map((convo) => convo.id);

      const allConversations = Object.values(conversations).map((convo) => ({
        ...convo,
        apiConfig: {
          ...convo.apiConfig,
          defaultSystemPromptId: currentPromptConversationIds.includes(convo.id)
            ? selectedSystemPrompt?.id
            : convo.apiConfig.defaultSystemPromptId === selectedSystemPrompt?.id
            ? // remove the the default System Prompt if it is assigned to a conversation
              // but that conversation is not in the currentPromptConversationList
              // This means conversation was removed in the current transaction
              undefined
            : //  leave it as it is .. if that conversation was neither added nor removed.
              convo.apiConfig.defaultSystemPromptId,
        },
      }));

      return allConversations;
    }, [selectedSystemPrompt, conversations, selectedConversations]);
    // Whether this system prompt should be the default for new conversations
    const [isNewConversationDefault, setIsNewConversationDefault] = useState(false);
    const handleNewConversationDefaultChange = useCallback(
      (e) => {
        const isChecked = e.target.checked;
        setIsNewConversationDefault(isChecked);
        if (selectedSystemPrompt != null) {
          setUpdatedSystemPrompts((prev) => {
            return prev.map((pp) => {
              return {
                ...pp,
                isNewConversationDefault: selectedSystemPrompt.id === pp.id && isChecked,
              };
            });
          });
          setSelectedSystemPrompt((prev) =>
            prev != null ? { ...prev, isNewConversationDefault: isChecked } : prev
          );
        }
      },
      [selectedSystemPrompt]
    );

    // When top level system prompt selection changes
    const onSystemPromptSelectionChange = useCallback(
      (systemPrompt?: Prompt | string) => {
        const newPrompt: Prompt | undefined =
          typeof systemPrompt === 'string'
            ? {
                id: systemPrompt ?? '',
                content: '',
                name: systemPrompt ?? '',
                promptType: 'system',
              }
            : systemPrompt;

        setSelectedSystemPrompt(newPrompt);
        setPrompt(newPrompt?.content ?? '');
        setIsNewConversationDefault(newPrompt?.isNewConversationDefault ?? false);
        // Find all conversations that have this system prompt as a default
        const currenlySelectedConversations =
          newPrompt != null
            ? Object.values(conversations).filter(
                (conversation) => conversation?.apiConfig.defaultSystemPromptId === newPrompt?.id
              )
            : [];
        setSelectedConversations(currenlySelectedConversations);
      },
      [conversations]
    );

    const onSystemPromptDeleted = useCallback((id: string) => {
      setUpdatedSystemPrompts((prev) => prev.filter((sp) => sp.id !== id));
    }, []);

    const handleSave = useCallback(() => {
      const updatedConversations = getUpdatedConversationWithPrompts();
      onSystemPromptsChange(updatedSystemPrompts, updatedConversations);
    }, [onSystemPromptsChange, updatedSystemPrompts, getUpdatedConversationWithPrompts]);

    // useEffects
    // Update system prompts on any field change since editing is in place
    useEffect(() => {
      if (selectedSystemPrompt != null) {
        setUpdatedSystemPrompts((prev) => {
          const alreadyExists = prev.some((sp) => sp.id === selectedSystemPrompt.id);
          if (alreadyExists) {
            return prev.map((sp) => {
              if (sp.id === selectedSystemPrompt.id) {
                return {
                  ...sp,
                  content: prompt,
                  promptType: 'system',
                };
              }
              return sp;
            });
          } else {
            return [
              ...prev,
              {
                ...selectedSystemPrompt,
                content: prompt,
                promptType: 'system',
              },
            ];
          }
        });
      }
    }, [prompt, selectedSystemPrompt]);

    return (
      <StyledEuiModal
        onClose={onClose}
        initialFocus={`.${SYSTEM_PROMPT_SELECTOR_CLASSNAME}`}
        data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.ID}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.ADD_SYSTEM_PROMPT_MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFormRow label={i18n.SYSTEM_PROMPT_NAME}>
            <SystemPromptSelector
              onSystemPromptDeleted={onSystemPromptDeleted}
              onSystemPromptSelectionChange={onSystemPromptSelectionChange}
              systemPrompts={updatedSystemPrompts}
              selectedSystemPrompt={selectedSystemPrompt}
            />
          </EuiFormRow>

          <EuiFormRow label={i18n.SYSTEM_PROMPT_PROMPT}>
            <EuiTextArea
              data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.PROMPT_TEXT}
              onChange={handlePromptTextChange}
              value={prompt}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.SYSTEM_PROMPT_DEFAULT_CONVERSATIONS}
            helpText={i18n.SYSTEM_PROMPT_DEFAULT_CONVERSATIONS_HELP_TEXT}
          >
            <ConversationMultiSelector
              onConversationSelectionChange={onConversationSelectionChange}
              conversations={Object.values(conversations)}
              selectedConversations={selectedConversations}
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiCheckbox
              id={'defaultNewConversation'}
              data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.TOGGLE_ALL_DEFAULT_CONVERSATIONS}
              label={
                <EuiFlexGroup alignItems="center" gutterSize={'xs'}>
                  <EuiFlexItem>{i18n.SYSTEM_PROMPT_DEFAULT_NEW_CONVERSATION}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={isNewConversationDefault ? 'starFilled' : 'starEmpty'} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              checked={isNewConversationDefault}
              onChange={handleNewConversationDefaultChange}
              compressed
            />
          </EuiFormRow>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose} data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.CANCEL}>
            {i18n.CANCEL}
          </EuiButtonEmpty>

          <EuiButton
            type="submit"
            onClick={handleSave}
            fill
            data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.SAVE}
          >
            {i18n.SAVE}
          </EuiButton>
        </EuiModalFooter>
      </StyledEuiModal>
    );
  }
);

SystemPromptModal.displayName = 'SystemPromptModal';
