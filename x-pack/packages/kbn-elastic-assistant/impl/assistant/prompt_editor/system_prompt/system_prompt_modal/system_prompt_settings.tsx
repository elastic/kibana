/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiText, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

<<<<<<< HEAD
import { keyBy } from 'lodash/fp';

import { css } from '@emotion/react';
import { ApiConfig } from '@kbn/elastic-assistant-common';
import {
  PerformBulkActionRequestBody,
  PromptResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { Conversation } from '../../../../..';
import * as i18n from './translations';
import { ConversationMultiSelector } from './conversation_multi_selector/conversation_multi_selector';
import { SystemPromptSelector } from './system_prompt_selector/system_prompt_selector';
import { TEST_IDS } from '../../../constants';
import { ConversationsBulkActions } from '../../../api';

interface Props {
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  onSelectedSystemPromptChange: (systemPrompt?: PromptResponse) => void;
  selectedSystemPrompt: PromptResponse | undefined;
  setPromptsBulkActions: React.Dispatch<React.SetStateAction<PerformBulkActionRequestBody>>;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<PromptResponse[]>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  systemPromptSettings: PromptResponse[];
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  promptsBulkActions: PerformBulkActionRequestBody;
  defaultConnector?: AIConnector;
}
=======
import * as i18n from './translations';
import { SystemPromptEditor } from './system_prompt_editor';
import { SystemPromptSettingsProps } from './types';
>>>>>>> upstream/main

/**
 * Settings for adding/removing system prompts. Configure name, prompt and default conversations.
 */
export const SystemPromptSettings: React.FC<SystemPromptSettingsProps> = React.memo(
  ({
    connectors,
    conversationSettings,
    onSelectedSystemPromptChange,
    selectedSystemPrompt,
    setUpdatedSystemPromptSettings,
    setConversationSettings,
    systemPromptSettings,
    conversationsSettingsBulkActions,
    setConversationsSettingsBulkActions,
    promptsBulkActions,
    defaultConnector,
    setPromptsBulkActions,
  }) => {
<<<<<<< HEAD
    // Prompt
    const promptContent = useMemo(
      () => selectedSystemPrompt?.content ?? '',
      [selectedSystemPrompt?.content]
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

          const existingPrompt = systemPromptSettings.find(
            (sp) => sp.id === selectedSystemPrompt.id
          );
          if (existingPrompt) {
            setPromptsBulkActions({
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
            });
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
                        actionTypeId: defaultConnector?.actionTypeId ?? '',
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
        defaultConnector?.actionTypeId,
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
          setPromptsBulkActions({
            ...promptsBulkActions,
            ...(selectedSystemPrompt.name !== selectedSystemPrompt.id
              ? {
                  update: [
                    ...(promptsBulkActions.update ?? []).filter(
                      (p) => p.id !== selectedSystemPrompt.id
                    ),
                    {
                      ...selectedSystemPrompt,
                      isNewConversationDefault: isChecked,
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
                      isNewConversationDefault: isChecked,
                    },
                  ],
                }),
          });
        }
      },
      [
        promptsBulkActions,
        selectedSystemPrompt,
        setUpdatedSystemPromptSettings,
        setPromptsBulkActions,
      ]
    );

    // When top level system prompt selection changes
    const onSystemPromptSelectionChange = useCallback(
      (systemPrompt?: PromptResponse | string) => {
        const isNew = typeof systemPrompt === 'string';
        const newSelectedSystemPrompt: PromptResponse | undefined = isNew
          ? {
              id: systemPrompt,
              content: '',
              name: systemPrompt ?? '',
              promptType: 'system',
              consumer: 'security',
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
          setPromptsBulkActions({
            ...promptsBulkActions,
            create: [
              ...(promptsBulkActions.create ?? []),
              {
                ...newSelectedSystemPrompt,
              },
            ],
          });
        }

        onSelectedSystemPromptChange(newSelectedSystemPrompt);
      },
      [
        onSelectedSystemPromptChange,
        promptsBulkActions,
        setPromptsBulkActions,
        setUpdatedSystemPromptSettings,
      ]
    );

    const onSystemPromptDeleted = useCallback(
      (id: string) => {
        setUpdatedSystemPromptSettings((prev) => prev.filter((sp) => sp.id !== id));
        setPromptsBulkActions({
          ...promptsBulkActions,
          delete: {
            ids: [...(promptsBulkActions.delete?.ids ?? []), id],
          },
        });
      },
      [promptsBulkActions, setPromptsBulkActions, setUpdatedSystemPromptSettings]
    );

=======
>>>>>>> upstream/main
    return (
      <>
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />

        <SystemPromptEditor
          connectors={connectors}
          conversationSettings={conversationSettings}
          onSelectedSystemPromptChange={onSelectedSystemPromptChange}
          selectedSystemPrompt={selectedSystemPrompt}
          setUpdatedSystemPromptSettings={setUpdatedSystemPromptSettings}
          setConversationSettings={setConversationSettings}
          systemPromptSettings={systemPromptSettings}
          conversationsSettingsBulkActions={conversationsSettingsBulkActions}
          setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
          defaultConnector={defaultConnector}
        />
      </>
    );
  }
);

SystemPromptSettings.displayName = 'SystemPromptSettings';
