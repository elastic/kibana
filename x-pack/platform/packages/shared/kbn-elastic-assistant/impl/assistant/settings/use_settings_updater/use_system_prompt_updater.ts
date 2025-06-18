/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiConfig,
  FindPromptsResponse,
  PromptResponse,
  PromptTypeEnum,
} from '@kbn/elastic-assistant-common';
import { HttpSetup } from '@kbn/core-http-browser';
import { PerformPromptsBulkActionRequestBody as PromptsPerformBulkActionRequestBody } from '@kbn/elastic-assistant-common/impl/schemas';
import { InfiniteData, QueryObserverResult } from '@tanstack/react-query';
import { IToasts } from '@kbn/core-notifications-browser';
import { AIConnector } from '../../../connectorland/connector_selector';
import { getConversationApiConfig } from '../../use_conversation/helpers';
import {
  bulkUpdatePrompts,
  Conversation,
  ConversationsBulkActions,
  useFetchCurrentUserConversations,
} from '../../../..';
import { FetchConversationsResponse } from '../../api';
interface Params {
  allPrompts: FindPromptsResponse;
  connectors?: AIConnector[];
  conversationsSettingsBulkActions: ConversationsBulkActions;
  currentAppId: string;
  defaultConnector?: AIConnector;
  http: HttpSetup;
  isAssistantEnabled: boolean;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  toasts?: IToasts;
}
export interface SystemPromptSettings extends PromptResponse {
  conversations: Conversation[];
}

interface SystemPromptUpdater {
  onConversationSelectionChange: (currentPromptConversations: Conversation[]) => void;
  onNewConversationDefaultChange: (isChecked: boolean) => void;
  onPromptContentChange: (newValue: string) => void;
  onSystemPromptDelete: (id: string) => void;
  onSystemPromptSelect: (systemPrompt?: SystemPromptSettings | string) => void;
  refetchSystemPromptConversations: () => Promise<
    QueryObserverResult<InfiniteData<FetchConversationsResponse>, unknown>
  >;
  resetSystemPromptSettings: () => void;
  saveSystemPromptSettings: () => Promise<{
    success: boolean;
    conversationUpdates?: ConversationsBulkActions;
  }>;
  selectedSystemPrompt?: SystemPromptSettings;
  systemPromptSettings: SystemPromptSettings[];
}
export const useSystemPromptUpdater = ({
  allPrompts,
  connectors,
  conversationsSettingsBulkActions,
  currentAppId,
  defaultConnector,
  http,
  isAssistantEnabled,
  setConversationsSettingsBulkActions,
  toasts,
}: Params): SystemPromptUpdater => {
  // server equivalent
  const [systemPromptSettings, setSystemPromptSettings] = useState<SystemPromptSettings[]>([]);
  // local updates
  const [systemPromptSettingsUpdates, setSystemPromptSettingsUpdates] = useState<
    SystemPromptSettings[]
  >([]);
  const [promptsBulkActions, setPromptsBulkActions] = useState<PromptsPerformBulkActionRequestBody>(
    {}
  );
  // System Prompt Selection State
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<
    SystemPromptSettings | undefined
  >();

  const systemPrompts = useMemo(() => {
    return allPrompts.data.filter((p) => p.promptType === PromptTypeEnum.system);
  }, [allPrompts.data]);

  const filter = useMemo(() => {
    const systemPromptIds = systemPrompts.map((p) => p.id);
    if (!Array.isArray(systemPromptIds) || systemPromptIds.length === 0) {
      return '';
    }

    return systemPromptIds
      .map((value) => `api_config.default_system_prompt_id: "${value}"`)
      .join(' OR ');
  }, [systemPrompts]);

  const { data, refetch } = useFetchCurrentUserConversations({
    http,
    isAssistantEnabled: isAssistantEnabled && filter.length > 0,
    filter,
  });
  useEffect(() => {
    if (!Object.keys(data).length && !systemPrompts.length) return;
    const updateSystemPromptSettings = (prev: SystemPromptSettings[]) => {
      const updatedSettings = systemPrompts.map((p) => {
        const conversations = Object.values(data).filter(
          (conversation) => conversation.apiConfig?.defaultSystemPromptId === p.id
        );
        return { ...p, conversations };
      });

      // Only update state if there's an actual change
      if (JSON.stringify(prev) !== JSON.stringify(updatedSettings)) {
        return updatedSettings;
      }
      return prev;
    };

    setSystemPromptSettings(updateSystemPromptSettings);
  }, [data, systemPrompts]);

  useEffect(() => {
    if (systemPromptSettings.length) {
      setSystemPromptSettingsUpdates(systemPromptSettings);
    }
  }, [systemPromptSettings]);

  const onSystemPromptSelect = useCallback(
    (systemPrompt?: SystemPromptSettings | string) => {
      if (systemPrompt == null) {
        return setSelectedSystemPrompt(undefined);
      }
      const isNew = typeof systemPrompt === 'string';
      const newSelectedSystemPrompt: SystemPromptSettings = isNew
        ? {
            id: '',
            content: '',
            name: systemPrompt ?? '',
            promptType: 'system',
            consumer: currentAppId,
            conversations: [],
          }
        : systemPrompt;

      if (isNew) {
        setPromptsBulkActions((prev) => ({
          ...prev,
          // only creating one new system prompt at a time
          create: [newSelectedSystemPrompt],
        }));
      }

      setSelectedSystemPrompt(newSelectedSystemPrompt);
    },
    [currentAppId]
  );

  const onSystemPromptDelete = useCallback(
    (id: string) => {
      setPromptsBulkActions({
        ...promptsBulkActions,
        delete: {
          ids: [...(promptsBulkActions.delete?.ids ?? []), id],
        },
      });
    },
    [promptsBulkActions, setPromptsBulkActions]
  );

  const onPromptContentChange = useCallback(
    (newValue: string) => {
      if (selectedSystemPrompt != null) {
        setSelectedSystemPrompt({
          ...selectedSystemPrompt,
          content: newValue,
        });

        const newBulkActions = {
          ...promptsBulkActions,
          ...(selectedSystemPrompt.id !== ''
            ? {
                update: [
                  ...(promptsBulkActions.update ?? []).filter(
                    (p) => p.id !== selectedSystemPrompt.id
                  ),
                  {
                    ...selectedSystemPrompt,
                    content: newValue,
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
                    content: newValue,
                  },
                ],
              }),
        };
        setPromptsBulkActions(newBulkActions);
      }
    },
    [promptsBulkActions, selectedSystemPrompt]
  );

  const onNewConversationDefaultChange = useCallback(
    (isChecked: boolean) => {
      const defaultNewSystemPrompts = systemPromptSettingsUpdates.filter(
        (p) => p.isNewConversationDefault
      );

      const shouldCreateNewDefaultSystemPrompts = (sp?: { name: string; id: string }) =>
        sp?.name === sp?.id; // Prompts before preserving have the SAME name and id

      const shouldUpdateNewDefaultSystemPrompts = (sp?: { name: string; id: string }) =>
        sp?.name !== sp?.id; // Prompts after preserving have different name and id

      const shouldCreateSelectedSystemPrompt = selectedSystemPrompt?.id === '';

      const shouldUpdateSelectedSystemPrompt = selectedSystemPrompt?.id !== '';

      if (selectedSystemPrompt != null) {
        setSelectedSystemPrompt({
          ...selectedSystemPrompt,
          isNewConversationDefault: isChecked,
        });
        // Update and Create prompts can happen at the same time, as we have to unchecked the previous default prompt
        // Each prompt can be updated or created
        setPromptsBulkActions(() => ({
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
        }));
      }
    },
    [selectedSystemPrompt, systemPromptSettingsUpdates]
  );
  const [_conversationRemovals, setConversationRemovals] = useState<Conversation[]>([]);

  const onConversationSelectionChange = useCallback(
    (currentPromptConversations: Conversation[]) => {
      const currentPromptConversationIds = currentPromptConversations.map((convo) => convo.id);
      const removals =
        selectedSystemPrompt?.conversations.filter(
          (c) => !currentPromptConversationIds.includes(c.id)
        ) ?? [];
      let cRemovals: Conversation[] = [];
      setConversationRemovals((prev) => {
        removals.forEach((r) => {
          if (!prev.find((p) => p.id === r.id)) {
            prev.push(r);
          }
        });
        cRemovals = prev.filter((c) => !currentPromptConversationIds.includes(c.id));
        return cRemovals;
      });
      const getDefaultSystemPromptId = (convo: Conversation) =>
        currentPromptConversationIds.includes(convo.id)
          ? selectedSystemPrompt?.id
          : convo.apiConfig && convo.apiConfig.defaultSystemPromptId === selectedSystemPrompt?.id
          ? // remove the default System Prompt if it is assigned to a conversation
            // but that conversation is not in the currentPromptConversationList
            // This means conversation was removed in the current transaction
            undefined
          : //  leave it as it is .. if that conversation was neither added nor removed.
            convo.apiConfig?.defaultSystemPromptId;

      if (selectedSystemPrompt != null) {
        setSelectedSystemPrompt({
          ...selectedSystemPrompt,
          conversations: currentPromptConversations,
        });
        let updatedConversationsSettingsBulkActions = { create: {}, update: {} };
        Object.values(currentPromptConversations).forEach((convo) => {
          const getApiConfigWithSelectedPrompt = (): ApiConfig | {} => {
            if (convo.apiConfig) {
              return {
                apiConfig: {
                  ...convo.apiConfig,
                  defaultSystemPromptId: getDefaultSystemPromptId(convo),
                },
              };
            }

            return {
              apiConfig: {
                ...getConversationApiConfig({
                  allSystemPrompts: systemPromptSettings,
                  connectors,
                  conversation: convo,
                  defaultConnector,
                }).apiConfig,
                defaultSystemPromptId: getDefaultSystemPromptId(convo),
              },
            };
          };

          const updateOperation =
            convo.id !== ''
              ? {
                  update: {
                    ...(updatedConversationsSettingsBulkActions.update ?? {}),
                    [convo.id]: {
                      ...getApiConfigWithSelectedPrompt(),
                    },
                  },
                }
              : {};

          updatedConversationsSettingsBulkActions = {
            ...updatedConversationsSettingsBulkActions,
            ...updateOperation,
          };
        });

        cRemovals.forEach((convo) => {
          const getApiConfigWithSelectedPrompt = (): ApiConfig | {} => {
            if (convo.apiConfig) {
              return {
                apiConfig: {
                  ...convo.apiConfig,
                  defaultSystemPromptId: undefined,
                },
              };
            }

            return {
              apiConfig: {
                ...getConversationApiConfig({
                  allSystemPrompts: systemPromptSettings,
                  connectors,
                  conversation: convo,
                  defaultConnector,
                }).apiConfig,
                defaultSystemPromptId: undefined,
              },
            };
          };

          const updateOperation =
            convo.id !== ''
              ? {
                  update: {
                    ...(updatedConversationsSettingsBulkActions.update ?? {}),
                    [convo.id]: {
                      ...getApiConfigWithSelectedPrompt(),
                    },
                  },
                }
              : {};

          updatedConversationsSettingsBulkActions = {
            ...updatedConversationsSettingsBulkActions,
            ...updateOperation,
          };
        });
        setConversationsSettingsBulkActions(updatedConversationsSettingsBulkActions);
      }
    },
    [
      systemPromptSettings,
      selectedSystemPrompt,
      setConversationsSettingsBulkActions,
      defaultConnector,
      connectors,
    ]
  );

  const resetSystemPromptSettings = useCallback((): void => {
    setConversationsSettingsBulkActions({});
    setPromptsBulkActions({});
    setSelectedSystemPrompt(undefined);
  }, [setConversationsSettingsBulkActions]);

  const saveSystemPromptSettings = useCallback(async (): Promise<{
    success: boolean;
    conversationUpdates?: ConversationsBulkActions;
  }> => {
    const hasBulkPrompts =
      promptsBulkActions.create || promptsBulkActions.update || promptsBulkActions.delete;

    const bulkPromptsResult = hasBulkPrompts
      ? await bulkUpdatePrompts(http, promptsBulkActions, toasts)
      : undefined;
    let conversationUpdates;
    if (
      // no prompt update or prompt update succeeded
      (!bulkPromptsResult || bulkPromptsResult?.success) &&
      conversationsSettingsBulkActions?.update
    ) {
      const updatesWithNewIds =
        conversationsSettingsBulkActions.update &&
        bulkPromptsResult?.attributes?.results?.created?.length
          ? Object.entries(conversationsSettingsBulkActions.update).reduce((acc, [key, value]) => {
              if (value.apiConfig?.defaultSystemPromptId === '') {
                // only creating one at a time
                const createdPrompt = bulkPromptsResult?.attributes?.results?.created[0];
                if (createdPrompt) {
                  return {
                    ...acc,
                    [key]: {
                      ...value,
                      apiConfig: { ...value.apiConfig, defaultSystemPromptId: createdPrompt.id },
                    },
                  };
                }
              }
              return acc;
            }, {})
          : {};
      conversationUpdates = {
        ...conversationsSettingsBulkActions,
        update: {
          ...conversationsSettingsBulkActions.update,
          ...updatesWithNewIds,
        },
      };
    }
    resetSystemPromptSettings();
    return {
      // if no bulk update status, only conversations need to update so return success === true
      success: bulkPromptsResult?.success ?? true,
      conversationUpdates,
    };
  }, [
    conversationsSettingsBulkActions,
    http,
    promptsBulkActions,
    resetSystemPromptSettings,
    toasts,
  ]);

  return {
    onConversationSelectionChange,
    onNewConversationDefaultChange,
    onPromptContentChange,
    onSystemPromptDelete,
    onSystemPromptSelect,
    refetchSystemPromptConversations: refetch,
    resetSystemPromptSettings,
    saveSystemPromptSettings,
    selectedSystemPrompt,
    systemPromptSettings: systemPromptSettingsUpdates,
  };
};
