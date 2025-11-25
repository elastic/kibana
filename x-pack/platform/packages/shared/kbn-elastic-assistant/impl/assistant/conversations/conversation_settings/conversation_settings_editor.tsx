/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiLink } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { HttpSetup } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { OpenAiProviderType } from '@kbn/connector-schemas/openai';
import type { PromptResponse, User } from '@kbn/elastic-assistant-common';
import {
  getCurrentConversationOwner,
  ConversationSharedState,
} from '@kbn/elastic-assistant-common';
import { ShareSelect } from '../../share_conversation/share_select';
import { useAssistantContext, type Conversation } from '../../../..';
import * as i18n from './translations';
import * as i18nModel from '../../../connectorland/models/model_selector/translations';

import type { AIConnector } from '../../../connectorland/connector_selector';
import { ConnectorSelector } from '../../../connectorland/connector_selector';
import { SelectSystemPrompt } from '../../prompt_editor/system_prompt/select_system_prompt';
import { ModelSelector } from '../../../connectorland/models/model_selector/model_selector';
import { useLoadConnectors } from '../../../connectorland/use_load_connectors';
import { getGenAiConfig } from '../../../connectorland/helpers';
import type { ConversationsBulkActions } from '../../api';
import { getDefaultSystemPrompt } from '../../use_conversation/helpers';

export interface ConversationSettingsEditorProps {
  allSystemPrompts: PromptResponse[];
  conversationSettings: Record<string, Conversation>;
  currentUser?: User;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  http: HttpSetup;
  isDisabled?: boolean;
  selectedConversation: Conversation;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
}

/**
 * Settings for adding/removing conversation and configuring default system prompt and connector.
 */
export const ConversationSettingsEditor: React.FC<ConversationSettingsEditorProps> = React.memo(
  ({
    allSystemPrompts,
    conversationsSettingsBulkActions,
    currentUser,
    http,
    isDisabled = false,
    selectedConversation,
    setConversationsSettingsBulkActions,
  }) => {
    const { settings } = useAssistantContext();
    const { data: connectors, isSuccess: areConnectorsFetched } = useLoadConnectors({
      http,
      settings,
    });
    const [conversationUpdates, setConversationUpdates] =
      useState<Conversation>(selectedConversation);
    useEffect(() => {
      if (selectedConversation?.id !== conversationUpdates?.id) {
        setConversationUpdates(selectedConversation);
      }
    }, [conversationUpdates?.id, selectedConversation]);
    const selectedSystemPrompt = useMemo(() => {
      return getDefaultSystemPrompt({ allSystemPrompts, conversation: conversationUpdates });
    }, [allSystemPrompts, conversationUpdates]);
    const handleOnSystemPromptSelectionChange = useCallback(
      (systemPromptId?: string | undefined) => {
        if (conversationUpdates != null && conversationUpdates.apiConfig) {
          const newSystemPromptId =
            conversationUpdates.apiConfig.defaultSystemPromptId === systemPromptId
              ? undefined
              : systemPromptId;
          const updatedConversation = {
            ...conversationUpdates,
            apiConfig: {
              ...conversationUpdates.apiConfig,
              defaultSystemPromptId: newSystemPromptId,
            },
          };
          setConversationUpdates(updatedConversation);
          setConversationsSettingsBulkActions({
            ...conversationsSettingsBulkActions,
            update: {
              ...(conversationsSettingsBulkActions.update ?? {}),
              [updatedConversation.id]: {
                ...(conversationsSettingsBulkActions.update
                  ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                  : {}),
                apiConfig: {
                  ...updatedConversation.apiConfig,
                  ...((conversationsSettingsBulkActions.update
                    ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                    : {}
                  ).apiConfig ?? {}),
                  defaultSystemPromptId: newSystemPromptId,
                },
                id: updatedConversation.id,
              },
            },
          });
        }
      },
      [conversationsSettingsBulkActions, conversationUpdates, setConversationsSettingsBulkActions]
    );

    const selectedConnector = useMemo(() => {
      const selectedConnectorId: string | undefined = conversationUpdates?.apiConfig?.connectorId;
      if (areConnectorsFetched) {
        return connectors?.find((c) => c.id === selectedConnectorId);
      }
      return undefined;
    }, [areConnectorsFetched, connectors, conversationUpdates?.apiConfig?.connectorId]);

    const selectedProvider = useMemo(
      () => conversationUpdates?.apiConfig?.provider,
      [conversationUpdates?.apiConfig?.provider]
    );

    const handleOnConnectorSelectionChange = useCallback(
      (connector: AIConnector) => {
        if (conversationUpdates != null) {
          const config = getGenAiConfig(connector);
          const updatedConversation = {
            ...conversationUpdates,
            apiConfig: {
              ...conversationUpdates.apiConfig,
              connectorId: connector.id,
              actionTypeId: connector.actionTypeId,
              provider: config?.apiProvider,
              model: config?.defaultModel,
            },
          };
          setConversationUpdates(updatedConversation);

          setConversationsSettingsBulkActions({
            ...conversationsSettingsBulkActions,
            update: {
              ...(conversationsSettingsBulkActions.update ?? {}),
              [updatedConversation.id]: {
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
                id: updatedConversation.id,
              },
            },
          });
        }
      },
      [conversationsSettingsBulkActions, conversationUpdates, setConversationsSettingsBulkActions]
    );

    const selectedModel = useMemo(() => {
      const connectorModel = getGenAiConfig(selectedConnector)?.defaultModel;
      // Prefer conversation configuration over connector default
      return conversationUpdates?.apiConfig?.model ?? connectorModel;
    }, [selectedConnector, conversationUpdates?.apiConfig?.model]);

    const handleOnModelSelectionChange = useCallback(
      (model?: string) => {
        if (conversationUpdates != null && conversationUpdates.apiConfig) {
          const updatedConversation = {
            ...conversationUpdates,
            apiConfig: {
              ...conversationUpdates.apiConfig,
              model,
            },
          };
          setConversationUpdates(updatedConversation);
          setConversationsSettingsBulkActions({
            ...conversationsSettingsBulkActions,
            update: {
              ...(conversationsSettingsBulkActions.update ?? {}),
              [updatedConversation.id]: {
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
                id: updatedConversation.id,
              },
            },
          });
        }
      },
      [conversationsSettingsBulkActions, conversationUpdates, setConversationsSettingsBulkActions]
    );
    const handleOnSharedSelectionChange = useCallback(
      (conversationSharedState: ConversationSharedState, nextUsers?: User[]) => {
        if (conversationUpdates != null) {
          let users: User[] = [];
          if (conversationSharedState === ConversationSharedState.PRIVATE) {
            users = [getCurrentConversationOwner(selectedConversation)];
          } else if (conversationSharedState === ConversationSharedState.RESTRICTED) {
            users = nextUsers ?? [];
          }
          // For ConversationSharedState.SHARED (globally), users remains []
          const updatedConversation = {
            ...conversationUpdates,
            users,
          };
          setConversationUpdates(updatedConversation);
          setConversationsSettingsBulkActions({
            ...conversationsSettingsBulkActions,
            update: {
              ...(conversationsSettingsBulkActions.update ?? {}),
              [updatedConversation.id]: {
                ...(conversationsSettingsBulkActions.update
                  ? conversationsSettingsBulkActions.update[updatedConversation.id] ?? {}
                  : {}),
                users,
                id: updatedConversation.id,
              },
            },
          });
        }
      },
      [
        conversationUpdates,
        selectedConversation,
        conversationsSettingsBulkActions,
        setConversationsSettingsBulkActions,
      ]
    );

    const handleUsersUpdate = useCallback(
      (users: User[]) => handleOnSharedSelectionChange(ConversationSharedState.RESTRICTED, users),
      [handleOnSharedSelectionChange]
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
            isDisabled={isDisabled}
            isSettingsModalVisible={true}
            onSystemPromptSelectionChange={handleOnSystemPromptSelectionChange}
            selectedPrompt={selectedSystemPrompt}
          />
        </EuiFormRow>

        <EuiFormRow
          data-test-subj="connector-field"
          display="rowCompressed"
          fullWidth
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
            fullWidth
            onConnectorSelectionChange={handleOnConnectorSelectionChange}
            selectedConnectorId={selectedConnector?.id}
          />
        </EuiFormRow>

        {!selectedConnector?.isPreconfigured && selectedProvider === OpenAiProviderType.OpenAi && (
          <EuiFormRow
            data-test-subj="model-field"
            display="rowCompressed"
            fullWidth
            label={i18nModel.MODEL_TITLE}
            helpText={i18nModel.HELP_LABEL}
          >
            <ModelSelector
              onModelSelectionChange={handleOnModelSelectionChange}
              selectedModel={selectedModel}
            />
          </EuiFormRow>
        )}
        {currentUser && (
          <EuiFormRow
            data-test-subj="shared-field"
            display="rowCompressed"
            fullWidth
            label={i18n.SHARING_OPTIONS}
          >
            <ShareSelect
              selectedConversation={selectedConversation}
              onSharedSelectionChange={handleOnSharedSelectionChange}
              onUsersUpdate={handleUsersUpdate}
            />
          </EuiFormRow>
        )}
      </>
    );
  }
);
ConversationSettingsEditor.displayName = 'ConversationSettingsEditor';
