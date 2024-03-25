/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFormRow,
  EuiTextArea,
  EuiCheckbox,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import { keyBy } from 'lodash/fp';

import { css } from '@emotion/react';
import { ApiConfig } from '@kbn/elastic-assistant-common';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { Conversation, Prompt } from '../../../../..';
import * as i18n from './translations';
import { ConversationMultiSelector } from './conversation_multi_selector/conversation_multi_selector';
import { SystemPromptSelector } from './system_prompt_selector/system_prompt_selector';
import { TEST_IDS } from '../../../constants';
import { ConversationsBulkActions } from '../../../api';

interface Props {
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  onSelectedSystemPromptChange: (systemPrompt?: Prompt) => void;
  selectedSystemPrompt: Prompt | undefined;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  systemPromptSettings: Prompt[];
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  defaultConnector?: AIConnector;
}

/**
 * Settings for adding/removing system prompts. Configure name, prompt and default conversations.
 */
export const SystemPromptSettings: React.FC<Props> = React.memo(
  ({
    conversationSettings,
    onSelectedSystemPromptChange,
    selectedSystemPrompt,
    setUpdatedSystemPromptSettings,
    setConversationSettings,
    systemPromptSettings,
    conversationsSettingsBulkActions,
    setConversationsSettingsBulkActions,
    defaultConnector,
  }) => {
    // Prompt
    const promptContent = useMemo(
      () => selectedSystemPrompt?.content ?? '',
      [selectedSystemPrompt?.content]
    );

    const handlePromptContentChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (selectedSystemPrompt != null) {
          setUpdatedSystemPromptSettings((prev): Prompt[] => {
            const alreadyExists = prev.some((sp) => sp.id === selectedSystemPrompt.id);

            if (alreadyExists) {
              return prev.map((sp): Prompt => {
                if (sp.id === selectedSystemPrompt.id) {
                  return {
                    ...sp,
                    content: e.target.value,
                  };
                }
                return sp;
              });
            }

            return prev;
          });
        }
      },
      [selectedSystemPrompt, setUpdatedSystemPromptSettings]
    );

    // Conversations this system prompt should be a default for
    const conversationOptions = useMemo(
      () => Object.values(conversationSettings),
      [conversationSettings]
    );
    const selectedConversations = useMemo(() => {
      return selectedSystemPrompt != null
        ? Object.values(conversationSettings).filter(
            (conversation) =>
              conversation.apiConfig?.defaultSystemPromptId === selectedSystemPrompt.id
          )
        : [];
    }, [conversationSettings, selectedSystemPrompt]);

    const handleConversationSelectionChange = useCallback(
      (currentPromptConversations: Conversation[]) => {
        const currentPromptConversationTitles = currentPromptConversations.map(
          (convo) => convo.title
        );
        const getDefaultSystemPromptId = (convo: Conversation) =>
          currentPromptConversationTitles.includes(convo.title)
            ? selectedSystemPrompt?.id
            : convo.apiConfig && convo.apiConfig.defaultSystemPromptId === selectedSystemPrompt?.id
            ? // remove the default System Prompt if it is assigned to a conversation
              // but that conversation is not in the currentPromptConversationList
              // This means conversation was removed in the current transaction
              undefined
            : //  leave it as it is .. if that conversation was neither added nor removed.
              convo.apiConfig?.defaultSystemPromptId;

        if (selectedSystemPrompt != null) {
          setConversationSettings((prev) =>
            keyBy(
              'title',
              /*
               * updatedConversationWithPrompts calculates the present of prompt for
               * each conversation. Based on the values of selected conversation, it goes
               * through each conversation adds/removed the selected prompt on each conversation.
               *
               * */
              Object.values(prev).map((convo) => ({
                ...convo,
                ...(convo.apiConfig
                  ? {
                      apiConfig: {
                        ...convo.apiConfig,
                        defaultSystemPromptId: getDefaultSystemPromptId(convo),
                      },
                    }
                  : {
                      apiConfig: {
                        defaultSystemPromptId: getDefaultSystemPromptId(convo),
                        connectorId: defaultConnector?.id ?? '',
                      },
                    }),
              }))
            )
          );

          let updatedConversationsSettingsBulkActions = { ...conversationsSettingsBulkActions };
          Object.values(conversationSettings).forEach((convo) => {
            const getApiConfig = (): ApiConfig | {} => {
              if (convo.apiConfig) {
                return {
                  apiConfig: {
                    ...convo.apiConfig,
                    defaultSystemPromptId: getDefaultSystemPromptId(convo),
                  },
                };
              }
              return {};
            };
            const createOperation =
              convo.id === ''
                ? {
                    create: {
                      ...(updatedConversationsSettingsBulkActions.create ?? {}),
                      [convo.id]: {
                        ...convo,
                        ...(convo.apiConfig
                          ? {
                              apiConfig: {
                                ...convo.apiConfig,
                                defaultSystemPromptId: getDefaultSystemPromptId(convo),
                              },
                            }
                          : {}),
                      },
                    },
                  }
                : {};

            const updateOperation =
              convo.id !== ''
                ? {
                    update: {
                      ...(updatedConversationsSettingsBulkActions.update ?? {}),
                      [convo.id]: {
                        ...(updatedConversationsSettingsBulkActions.update
                          ? updatedConversationsSettingsBulkActions.update[convo.id] ?? {}
                          : {}),
                        ...getApiConfig(),
                      },
                    },
                  }
                : {};

            updatedConversationsSettingsBulkActions = {
              ...updatedConversationsSettingsBulkActions,
              ...createOperation,
              ...updateOperation,
            };
          });
          setConversationsSettingsBulkActions(updatedConversationsSettingsBulkActions);
        }
      },
      [
        conversationSettings,
        conversationsSettingsBulkActions,
        defaultConnector?.id,
        selectedSystemPrompt,
        setConversationSettings,
        setConversationsSettingsBulkActions,
      ]
    );

    // Whether this system prompt should be the default for new conversations
    const isNewConversationDefault = useMemo(
      () => selectedSystemPrompt?.isNewConversationDefault ?? false,
      [selectedSystemPrompt?.isNewConversationDefault]
    );

    const handleNewConversationDefaultChange = useCallback(
      (e) => {
        const isChecked = e.target.checked;

        if (selectedSystemPrompt != null) {
          setUpdatedSystemPromptSettings((prev) => {
            return prev.map((pp) => {
              return {
                ...pp,
                isNewConversationDefault: selectedSystemPrompt.id === pp.id && isChecked,
              };
            });
          });
        }
      },
      [selectedSystemPrompt, setUpdatedSystemPromptSettings]
    );

    // When top level system prompt selection changes
    const onSystemPromptSelectionChange = useCallback(
      (systemPrompt?: Prompt | string) => {
        const isNew = typeof systemPrompt === 'string';
        const newSelectedSystemPrompt: Prompt | undefined = isNew
          ? {
              id: systemPrompt ?? '',
              content: '',
              name: systemPrompt ?? '',
              promptType: 'system',
            }
          : systemPrompt;

        if (newSelectedSystemPrompt != null) {
          setUpdatedSystemPromptSettings((prev) => {
            const alreadyExists = prev.some((sp) => sp.id === newSelectedSystemPrompt.id);

            if (!alreadyExists) {
              return [...prev, newSelectedSystemPrompt];
            }

            return prev;
          });
        }

        onSelectedSystemPromptChange(newSelectedSystemPrompt);
      },
      [onSelectedSystemPromptChange, setUpdatedSystemPromptSettings]
    );

    const onSystemPromptDeleted = useCallback(
      (id: string) => {
        setUpdatedSystemPromptSettings((prev) => prev.filter((sp) => sp.id !== id));
      },
      [setUpdatedSystemPromptSettings]
    );

    return (
      <>
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />

        <EuiFormRow display="rowCompressed" label={i18n.SYSTEM_PROMPT_NAME} fullWidth>
          <SystemPromptSelector
            onSystemPromptDeleted={onSystemPromptDeleted}
            onSystemPromptSelectionChange={onSystemPromptSelectionChange}
            systemPrompts={systemPromptSettings}
            selectedSystemPrompt={selectedSystemPrompt}
          />
        </EuiFormRow>
        <EuiFormRow display="rowCompressed" label={i18n.SYSTEM_PROMPT_PROMPT} fullWidth>
          <EuiTextArea
            data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.PROMPT_TEXT}
            disabled={selectedSystemPrompt == null}
            onChange={handlePromptContentChange}
            placeholder={i18n.SYSTEM_PROMPT_PROMPT_PLACEHOLDER}
            value={promptContent}
            compressed
            fullWidth
            css={css`
              min-height: 150px;
            `}
          />
        </EuiFormRow>
        <EuiFormRow
          display="rowCompressed"
          fullWidth
          helpText={i18n.SYSTEM_PROMPT_DEFAULT_CONVERSATIONS_HELP_TEXT}
          label={i18n.SYSTEM_PROMPT_DEFAULT_CONVERSATIONS}
        >
          <ConversationMultiSelector
            conversations={conversationOptions}
            isDisabled={selectedSystemPrompt == null}
            onConversationSelectionChange={handleConversationSelectionChange}
            selectedConversations={selectedConversations}
          />
        </EuiFormRow>

        <EuiFormRow display="rowCompressed">
          <EuiCheckbox
            data-test-subj={TEST_IDS.SYSTEM_PROMPT_MODAL.TOGGLE_ALL_DEFAULT_CONVERSATIONS}
            disabled={selectedSystemPrompt == null}
            id={'defaultNewConversation'}
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
      </>
    );
  }
);

SystemPromptSettings.displayName = 'SystemPromptSettings';
