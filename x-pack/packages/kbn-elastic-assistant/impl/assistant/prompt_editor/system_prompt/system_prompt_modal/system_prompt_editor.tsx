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
} from '@elastic/eui';

import { keyBy } from 'lodash/fp';

import { css } from '@emotion/react';
import {
  PromptResponse,
  PerformPromptsBulkActionRequestBody as PromptsPerformBulkActionRequestBody,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { ApiConfig } from '@kbn/elastic-assistant-common';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { Conversation } from '../../../../..';
import * as i18n from './translations';
import { ConversationMultiSelector } from './conversation_multi_selector/conversation_multi_selector';
import { SystemPromptSelector } from './system_prompt_selector/system_prompt_selector';
import { TEST_IDS } from '../../../constants';
import { ConversationsBulkActions } from '../../../api';
import { getSelectedConversations } from '../system_prompt_settings_management/utils';
import { useSystemPromptEditor } from './use_system_prompt_editor';
import {
  getConversationApiConfig,
  getFallbackDefaultSystemPrompt,
} from '../../../use_conversation/helpers';

interface Props {
  connectors: AIConnector[] | undefined;
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  onSelectedSystemPromptChange: (systemPrompt?: PromptResponse) => void;
  selectedSystemPrompt: PromptResponse | undefined;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<PromptResponse[]>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  systemPromptSettings: PromptResponse[];
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  defaultConnector?: AIConnector;
  resetSettings?: () => void;
  promptsBulkActions: PromptsPerformBulkActionRequestBody;
  setPromptsBulkActions: React.Dispatch<React.SetStateAction<PromptsPerformBulkActionRequestBody>>;
}

/**
 * Settings for adding/removing system prompts. Configure name, prompt and default conversations.
 */
export const SystemPromptEditorComponent: React.FC<Props> = ({
  connectors,
  conversationSettings,
  onSelectedSystemPromptChange,
  selectedSystemPrompt,
  setUpdatedSystemPromptSettings,
  setConversationSettings,
  systemPromptSettings,
  conversationsSettingsBulkActions,
  setConversationsSettingsBulkActions,
  defaultConnector,
  resetSettings,
  promptsBulkActions,
  setPromptsBulkActions,
}) => {
  // Prompt
  const promptContent = useMemo(
    // Fixing Cursor Jump in text area
    () => systemPromptSettings.find((sp) => sp.id === selectedSystemPrompt?.id)?.content ?? '',
    [selectedSystemPrompt?.id, systemPromptSettings]
  );

  const handlePromptContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (selectedSystemPrompt != null) {
        setUpdatedSystemPromptSettings((prev): PromptResponse[] => {
          const alreadyExists = prev.some((sp) => sp.id === selectedSystemPrompt.id);

          if (alreadyExists) {
            return prev.map((sp): PromptResponse => {
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
        const existingPrompt = systemPromptSettings.find((sp) => sp.id === selectedSystemPrompt.id);
        if (existingPrompt) {
          const newBulkActions = {
            ...promptsBulkActions,
            ...(selectedSystemPrompt.name !== selectedSystemPrompt.id
              ? {
                  update: [
                    ...(promptsBulkActions.update ?? []).filter(
                      (p) => p.id !== selectedSystemPrompt.id
                    ),
                    {
                      ...selectedSystemPrompt,
                      content: e.target.value,
                    },
                  ],
                }
              : {
                  create: [
                    ...(promptsBulkActions.create ?? []).filter(
                      (p) => p.name !== selectedSystemPrompt.name
                    ),
                    {
                      ...selectedSystemPrompt,
                      content: e.target.value,
                    },
                  ],
                }),
          };
          setPromptsBulkActions(newBulkActions);
        }
      }
    },
    [
      promptsBulkActions,
      selectedSystemPrompt,
      setPromptsBulkActions,
      setUpdatedSystemPromptSettings,
      systemPromptSettings,
    ]
  );

  const conversationsWithApiConfig = Object.entries(conversationSettings).reduce<
    Record<string, Conversation>
  >((acc, [key, conversation]) => {
    acc[key] = {
      ...conversation,
      ...getConversationApiConfig({
        allSystemPrompts: systemPromptSettings,
        connectors,
        conversation,
        defaultConnector,
      }),
    };
    return acc;
  }, {});
  // Conversations this system prompt should be a default for
  const conversationOptions = useMemo(
    () => Object.values(conversationsWithApiConfig),
    [conversationsWithApiConfig]
  );

  const selectedConversations = useMemo(() => {
    return selectedSystemPrompt != null
      ? getSelectedConversations(conversationsWithApiConfig, selectedSystemPrompt.id)
      : [];
  }, [conversationsWithApiConfig, selectedSystemPrompt]);

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
            Object.values(prev).map((convo) => {
              const newConversationSetting = {
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
                        actionTypeId: defaultConnector?.actionTypeId ?? '',
                      },
                    }),
              };
              return newConversationSetting;
            })
          )
        );

        let updatedConversationsSettingsBulkActions = { ...conversationsSettingsBulkActions };
        Object.values(conversationsWithApiConfig).forEach((convo) => {
          const getApiConfigWithSelectedPrompt = (): ApiConfig | {} => {
            if (convo.apiConfig) {
              return {
                apiConfig: {
                  ...getConversationApiConfig({
                    allSystemPrompts: systemPromptSettings,
                    connectors,
                    conversation: convo,
                    defaultConnector,
                  }).apiConfig,
                  defaultSystemPromptId:
                    getDefaultSystemPromptId(convo) ??
                    getFallbackDefaultSystemPrompt({ allSystemPrompts: systemPromptSettings })?.id,
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
                    [convo.title]: {
                      ...convo,
                      ...(convo.apiConfig ? getApiConfigWithSelectedPrompt() : {}),
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
                      ...getApiConfigWithSelectedPrompt(),
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
      connectors,
      conversationsSettingsBulkActions,
      conversationsWithApiConfig,
      defaultConnector,
      selectedSystemPrompt,
      setConversationSettings,
      setConversationsSettingsBulkActions,
      systemPromptSettings,
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
      const defaultNewSystemPrompts = systemPromptSettings.filter(
        (p) => p.isNewConversationDefault
      );

      const shouldCreateNewDefaultSystemPrompts = (sp?: { name: string; id: string }) =>
        sp?.name === sp?.id; // Prompts before preserving have the SAME name and id

      const shouldUpdateNewDefaultSystemPrompts = (sp?: { name: string; id: string }) =>
        sp?.name !== sp?.id; // Prompts after preserving have different name and id

      const shouldCreateSelectedSystemPrompt =
        selectedSystemPrompt?.name === selectedSystemPrompt?.id;

      const shouldUpdateSelectedSystemPrompt =
        selectedSystemPrompt?.name !== selectedSystemPrompt?.id;

      if (selectedSystemPrompt != null) {
        setUpdatedSystemPromptSettings((prev) => {
          return prev.map((pp) => {
            return {
              ...pp,
              isNewConversationDefault: selectedSystemPrompt.id === pp.id && isChecked,
            };
          });
        });
        // Update and Create prompts can happen at the same time, as we have to unchecked the previous default prompt
        // Each prompt can be updated or created
        setPromptsBulkActions(() => {
          const newBulkActions = {
            update: [
              ...defaultNewSystemPrompts
                .filter(
                  (p) => p.id !== selectedSystemPrompt.id && shouldUpdateNewDefaultSystemPrompts(p)
                )
                .map((p) => ({
                  ...p,
                  isNewConversationDefault: false,
                })),

              ...(shouldUpdateSelectedSystemPrompt
                ? [
                    {
                      ...selectedSystemPrompt,
                      isNewConversationDefault: isChecked,
                    },
                  ]
                : []),
            ],
            create: [
              ...defaultNewSystemPrompts
                .filter(
                  (p) =>
                    p.name !== selectedSystemPrompt.name && shouldCreateNewDefaultSystemPrompts(p)
                )
                .map((p) => ({
                  ...p,
                  isNewConversationDefault: false,
                })),

              ...(shouldCreateSelectedSystemPrompt
                ? [
                    {
                      ...selectedSystemPrompt,
                      isNewConversationDefault: isChecked,
                    },
                  ]
                : []),
            ],
          };

          return newBulkActions;
        });
      }
    },
    [
      selectedSystemPrompt,
      setPromptsBulkActions,
      setUpdatedSystemPromptSettings,
      systemPromptSettings,
    ]
  );

  const { onSystemPromptSelectionChange, onSystemPromptDeleted } = useSystemPromptEditor({
    setUpdatedSystemPromptSettings,
    onSelectedSystemPromptChange,
    promptsBulkActions,
    setPromptsBulkActions,
  });

  return (
    <>
      <EuiFormRow display="rowCompressed" label={i18n.SYSTEM_PROMPT_NAME} fullWidth>
        <SystemPromptSelector
          onSystemPromptDeleted={onSystemPromptDeleted}
          onSystemPromptSelectionChange={onSystemPromptSelectionChange}
          selectedSystemPrompt={selectedSystemPrompt}
          resetSettings={resetSettings}
          systemPrompts={systemPromptSettings}
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
        />
      </EuiFormRow>
    </>
  );
};

export const SystemPromptEditor = React.memo(SystemPromptEditorComponent);

SystemPromptEditor.displayName = 'SystemPromptEditor';
