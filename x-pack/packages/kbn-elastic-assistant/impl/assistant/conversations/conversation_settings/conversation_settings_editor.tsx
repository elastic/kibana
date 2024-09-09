/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiLink } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { HttpSetup } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { noop } from 'lodash/fp';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { QueryObserverResult } from '@tanstack/react-query';
import { Conversation } from '../../../..';
import * as i18n from './translations';
import * as i18nModel from '../../../connectorland/models/model_selector/translations';

import { AIConnector, ConnectorSelector } from '../../../connectorland/connector_selector';
import { SelectSystemPrompt } from '../../prompt_editor/system_prompt/select_system_prompt';
import { ModelSelector } from '../../../connectorland/models/model_selector/model_selector';
import { useLoadConnectors } from '../../../connectorland/use_load_connectors';
import { getGenAiConfig } from '../../../connectorland/helpers';
import { ConversationsBulkActions } from '../../api';
import { getDefaultSystemPrompt } from '../../use_conversation/helpers';

export interface ConversationSettingsEditorProps {
  allSystemPrompts: PromptResponse[];
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  http: HttpSetup;
  isDisabled?: boolean;
  selectedConversation?: Conversation;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  onSelectedConversationChange: (conversation?: Conversation) => void;
  refetchConversations?: () => Promise<QueryObserverResult<Record<string, Conversation>, unknown>>;
}

/**
 * Settings for adding/removing conversation and configuring default system prompt and connector.
 */
export const ConversationSettingsEditor: React.FC<ConversationSettingsEditorProps> = React.memo(
  ({
    allSystemPrompts,
    selectedConversation,
    conversationSettings,
    http,
    isDisabled = false,
    setConversationSettings,
    conversationsSettingsBulkActions,
    setConversationsSettingsBulkActions,
    onSelectedConversationChange,
    refetchConversations,
  }) => {
    const { data: connectors, isSuccess: areConnectorsFetched } = useLoadConnectors({
      http,
    });
    const selectedSystemPrompt = useMemo(() => {
      return getDefaultSystemPrompt({ allSystemPrompts, conversation: selectedConversation });
    }, [allSystemPrompts, selectedConversation]);
    const handleOnSystemPromptSelectionChange = useCallback(
      (systemPromptId?: string | undefined) => {
        if (selectedConversation != null && selectedConversation.apiConfig) {
          const updatedConversation = {
            ...selectedConversation,
            apiConfig: {
              ...selectedConversation.apiConfig,
              defaultSystemPromptId: systemPromptId,
            },
          };
          setConversationSettings({
            ...conversationSettings,
            [updatedConversation.id || updatedConversation.title]: updatedConversation,
          });
          if (selectedConversation.id !== '') {
            setConversationsSettingsBulkActions({
              ...conversationsSettingsBulkActions,
              update: {
                ...(conversationsSettingsBulkActions.update ?? {}),
                [updatedConversation.id]: {
                  ...updatedConversation,
                  ...(conversationsSettingsBulkActions.update
                    ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                    : {}),
                  apiConfig: {
                    ...updatedConversation.apiConfig,
                    ...((conversationsSettingsBulkActions.update
                      ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                      : {}
                    ).apiConfig ?? {}),
                    defaultSystemPromptId: systemPromptId,
                  },
                },
              },
            });
          } else {
            const createdConversation = {
              ...conversationsSettingsBulkActions,
              create: {
                ...(conversationsSettingsBulkActions.create ?? {}),
                [updatedConversation.title]: updatedConversation,
              },
            };
            setConversationsSettingsBulkActions(createdConversation);
          }
        }
      },
      [
        conversationSettings,
        conversationsSettingsBulkActions,
        selectedConversation,
        setConversationSettings,
        setConversationsSettingsBulkActions,
      ]
    );

    const selectedConnector = useMemo(() => {
      const selectedConnectorId: string | undefined = selectedConversation?.apiConfig?.connectorId;
      if (areConnectorsFetched) {
        return connectors?.find((c) => c.id === selectedConnectorId);
      }
      return undefined;
    }, [areConnectorsFetched, connectors, selectedConversation?.apiConfig?.connectorId]);

    const selectedProvider = useMemo(
      () => selectedConversation?.apiConfig?.provider,
      [selectedConversation?.apiConfig?.provider]
    );

    const selectedConversationId = useMemo(
      () =>
        selectedConversation?.id === ''
          ? selectedConversation.title
          : (selectedConversation?.id as string),
      [selectedConversation]
    );
    const handleOnConnectorSelectionChange = useCallback(
      (connector: AIConnector) => {
        if (selectedConversation != null) {
          const config = getGenAiConfig(connector);
          const updatedConversation = {
            ...selectedConversation,
            apiConfig: {
              ...selectedConversation.apiConfig,
              connectorId: connector.id,
              actionTypeId: connector.actionTypeId,
              provider: config?.apiProvider,
              model: config?.defaultModel,
            },
          };
          setConversationSettings({
            ...conversationSettings,
            [selectedConversationId]: updatedConversation,
          });
          if (selectedConversation.id !== '') {
            setConversationsSettingsBulkActions({
              ...conversationsSettingsBulkActions,
              update: {
                ...(conversationsSettingsBulkActions.update ?? {}),
                [updatedConversation.id || updatedConversation.title]: {
                  ...updatedConversation,
                  ...(conversationsSettingsBulkActions.update
                    ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                    : {}),
                  apiConfig: {
                    ...updatedConversation.apiConfig,
                    ...((conversationsSettingsBulkActions.update
                      ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                      : {}
                    ).apiConfig ?? {}),
                    connectorId: connector?.id,
                    actionTypeId: connector?.actionTypeId,
                    provider: config?.apiProvider,
                    model: config?.defaultModel,
                  },
                },
              },
            });
          } else {
            const createdConversation = {
              ...conversationsSettingsBulkActions,
              create: {
                ...(conversationsSettingsBulkActions.create ?? {}),
                [updatedConversation.title || updatedConversation.id]: updatedConversation,
              },
            };
            setConversationsSettingsBulkActions(createdConversation);
          }
        }
      },
      [
        conversationSettings,
        conversationsSettingsBulkActions,
        selectedConversation,
        selectedConversationId,
        setConversationSettings,
        setConversationsSettingsBulkActions,
      ]
    );

    const selectedModel = useMemo(() => {
      const connectorModel = getGenAiConfig(selectedConnector)?.defaultModel;
      // Prefer conversation configuration over connector default
      return selectedConversation?.apiConfig?.model ?? connectorModel;
    }, [selectedConnector, selectedConversation?.apiConfig?.model]);

    const handleOnModelSelectionChange = useCallback(
      (model?: string) => {
        if (selectedConversation != null && selectedConversation.apiConfig) {
          const updatedConversation = {
            ...selectedConversation,
            apiConfig: {
              ...selectedConversation.apiConfig,
              model,
            },
          };
          setConversationSettings({
            ...conversationSettings,
            [updatedConversation.id || updatedConversation.title]: updatedConversation,
          });
          if (selectedConversation.id !== '') {
            setConversationsSettingsBulkActions({
              ...conversationsSettingsBulkActions,
              update: {
                ...(conversationsSettingsBulkActions.update ?? {}),
                [updatedConversation.id]: {
                  ...updatedConversation,
                  ...(conversationsSettingsBulkActions.update
                    ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                    : {}),
                  apiConfig: {
                    ...updatedConversation.apiConfig,
                    ...((conversationsSettingsBulkActions.update
                      ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                      : {}
                    ).apiConfig ?? {}),
                    model,
                  },
                },
              },
            });
          } else {
            const createdConversation = {
              ...conversationsSettingsBulkActions,
              create: {
                ...(conversationsSettingsBulkActions.create ?? {}),
                [updatedConversation.id || updatedConversation.title]: updatedConversation,
              },
            };
            setConversationsSettingsBulkActions(createdConversation);
          }
        }
      },
      [
        conversationSettings,
        conversationsSettingsBulkActions,
        selectedConversation,
        setConversationSettings,
        setConversationsSettingsBulkActions,
      ]
    );
    return (
      <>
        <EuiFormRow
          data-test-subj="prompt-field"
          display="rowCompressed"
          fullWidth
          label={i18n.SETTINGS_PROMPT_TITLE}
          helpText={i18n.SETTINGS_PROMPT_HELP_TEXT_TITLE}
        >
          <SelectSystemPrompt
            allPrompts={allSystemPrompts}
            compressed
            conversation={selectedConversation}
            isDisabled={isDisabled}
            onSystemPromptSelectionChange={handleOnSystemPromptSelectionChange}
            refetchConversations={refetchConversations}
            selectedPrompt={selectedSystemPrompt}
            isSettingsModalVisible={true}
            setIsSettingsModalVisible={noop} // noop, already in settings
            onSelectedConversationChange={onSelectedConversationChange}
            setConversationSettings={setConversationSettings}
            setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
          />
        </EuiFormRow>

        <EuiFormRow
          data-test-subj="connector-field"
          display="rowCompressed"
          label={i18n.CONNECTOR_TITLE}
          helpText={
            <EuiLink
              href={`${http.basePath.get()}/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`}
              target="_blank"
              external
            >
              <FormattedMessage
                id="xpack.elasticAssistant.assistant.settings.connectorHelpTextTitle"
                defaultMessage="The default LLM connector for this conversation type."
              />
            </EuiLink>
          }
        >
          <ConnectorSelector
            isDisabled={isDisabled}
            onConnectorSelectionChange={handleOnConnectorSelectionChange}
            selectedConnectorId={selectedConnector?.id}
          />
        </EuiFormRow>

        {selectedConnector?.isPreconfigured === false &&
          selectedProvider === OpenAiProviderType.OpenAi && (
            <EuiFormRow
              data-test-subj="model-field"
              display="rowCompressed"
              label={i18nModel.MODEL_TITLE}
              helpText={i18nModel.HELP_LABEL}
            >
              <ModelSelector
                onModelSelectionChange={handleOnModelSelectionChange}
                selectedModel={selectedModel}
              />
            </EuiFormRow>
          )}
      </>
    );
  }
);
ConversationSettingsEditor.displayName = 'ConversationSettingsEditor';
