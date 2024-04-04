/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFormRow,
  EuiLink,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { HttpSetup } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { noop } from 'lodash/fp';
import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { Conversation, Prompt } from '../../../..';
import * as i18n from './translations';
import * as i18nModel from '../../../connectorland/models/model_selector/translations';

import { AIConnector, ConnectorSelector } from '../../../connectorland/connector_selector';
import { SelectSystemPrompt } from '../../prompt_editor/system_prompt/select_system_prompt';
import { ModelSelector } from '../../../connectorland/models/model_selector/model_selector';
import { ConversationSelectorSettings } from '../conversation_selector_settings';
import { getDefaultSystemPrompt } from '../../use_conversation/helpers';
import { useLoadConnectors } from '../../../connectorland/use_load_connectors';
import { getGenAiConfig } from '../../../connectorland/helpers';
import { ConversationsBulkActions } from '../../api';

export interface ConversationSettingsProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  allSystemPrompts: Prompt[];
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  defaultConnector?: AIConnector;
  assistantStreamingEnabled: boolean;
  http: HttpSetup;
  onSelectedConversationChange: (conversation?: Conversation) => void;
  selectedConversation?: Conversation;
  setAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  isDisabled?: boolean;
}

/**
 * Settings for adding/removing conversation and configuring default system prompt and connector.
 */
export const ConversationSettings: React.FC<ConversationSettingsProps> = React.memo(
  ({
    allSystemPrompts,
    assistantStreamingEnabled,
    defaultConnector,
    selectedConversation,
    onSelectedConversationChange,
    conversationSettings,
    http,
    isDisabled = false,
    setAssistantStreamingEnabled,
    setConversationSettings,
    conversationsSettingsBulkActions,
    setConversationsSettingsBulkActions,
  }) => {
    const defaultSystemPrompt = useMemo(() => {
      return getDefaultSystemPrompt({ allSystemPrompts, conversation: undefined });
    }, [allSystemPrompts]);

    const selectedSystemPrompt = useMemo(() => {
      return getDefaultSystemPrompt({ allSystemPrompts, conversation: selectedConversation });
    }, [allSystemPrompts, selectedConversation]);

    const { data: connectors, isSuccess: areConnectorsFetched } = useLoadConnectors({
      http,
    });

    // Conversation callbacks
    // When top level conversation selection changes
    const onConversationSelectionChange = useCallback(
      (c?: Conversation | string) => {
        const isNew = typeof c === 'string';

        const newSelectedConversation: Conversation | undefined = isNew
          ? {
              id: '',
              title: c ?? '',
              category: 'assistant',
              messages: [],
              replacements: {},
              ...(defaultConnector
                ? {
                    apiConfig: {
                      connectorId: defaultConnector.id,
                      provider: defaultConnector.apiProvider,
                      defaultSystemPromptId: defaultSystemPrompt?.id,
                    },
                  }
                : {}),
            }
          : c;

        if (newSelectedConversation && (isNew || newSelectedConversation.id === '')) {
          setConversationSettings({
            ...conversationSettings,
            [isNew ? c : newSelectedConversation.title]: newSelectedConversation,
          });
          setConversationsSettingsBulkActions({
            ...conversationsSettingsBulkActions,
            create: {
              ...(conversationsSettingsBulkActions.create ?? {}),
              [newSelectedConversation.title]: newSelectedConversation,
            },
          });
        } else if (newSelectedConversation != null) {
          setConversationSettings((prev) => {
            return {
              ...prev,
              [newSelectedConversation.title]: newSelectedConversation,
            };
          });
        }

        onSelectedConversationChange(newSelectedConversation);
      },
      [
        conversationSettings,
        conversationsSettingsBulkActions,
        defaultConnector,
        defaultSystemPrompt?.id,
        onSelectedConversationChange,
        setConversationSettings,
        setConversationsSettingsBulkActions,
      ]
    );

    const onConversationDeleted = useCallback(
      (conversationTitle: string) => {
        const conversationId = conversationSettings[conversationTitle].id;
        const updatedConversationSettings = { ...conversationSettings };
        delete updatedConversationSettings[conversationTitle];
        setConversationSettings(updatedConversationSettings);

        setConversationsSettingsBulkActions({
          ...conversationsSettingsBulkActions,
          delete: {
            ids: [...(conversationsSettingsBulkActions.delete?.ids ?? []), conversationId],
          },
        });
      },
      [
        conversationSettings,
        conversationsSettingsBulkActions,
        setConversationSettings,
        setConversationsSettingsBulkActions,
      ]
    );

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
            [updatedConversation.title]: updatedConversation,
          });
          if (selectedConversation.id !== '') {
            setConversationsSettingsBulkActions({
              ...conversationsSettingsBulkActions,
              update: {
                ...(conversationsSettingsBulkActions.update ?? {}),
                [updatedConversation.title]: {
                  ...updatedConversation,
                  ...(conversationsSettingsBulkActions.update
                    ? conversationsSettingsBulkActions.update[updatedConversation.title] ?? {}
                    : {}),
                  apiConfig: {
                    ...updatedConversation.apiConfig,
                    ...((conversationsSettingsBulkActions.update
                      ? conversationsSettingsBulkActions.update[updatedConversation.title] ?? {}
                      : {}
                    ).apiConfig ?? {}),
                    defaultSystemPromptId: systemPromptId,
                  },
                },
              },
            });
          } else {
            setConversationsSettingsBulkActions({
              ...conversationsSettingsBulkActions,
              create: {
                ...(conversationsSettingsBulkActions.create ?? {}),
                [updatedConversation.title]: updatedConversation,
              },
            });
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
      const selectedConnectorId = selectedConversation?.apiConfig?.connectorId;
      if (areConnectorsFetched) {
        return connectors?.find((c) => c.id === selectedConnectorId);
      }
      return undefined;
    }, [areConnectorsFetched, connectors, selectedConversation?.apiConfig?.connectorId]);

    const selectedProvider = useMemo(
      () => selectedConversation?.apiConfig?.provider,
      [selectedConversation?.apiConfig?.provider]
    );

    const handleOnConnectorSelectionChange = useCallback(
      (connector) => {
        if (selectedConversation != null) {
          const config = getGenAiConfig(connector);
          const updatedConversation = {
            ...selectedConversation,
            apiConfig: {
              ...selectedConversation.apiConfig,
              connectorId: connector.id,
              provider: config?.apiProvider,
              model: config?.defaultModel,
            },
          };
          setConversationSettings({
            ...conversationSettings,
            [selectedConversation.title]: updatedConversation,
          });
          if (selectedConversation.id !== '') {
            setConversationsSettingsBulkActions({
              ...conversationsSettingsBulkActions,
              update: {
                ...(conversationsSettingsBulkActions.update ?? {}),
                [updatedConversation.title]: {
                  ...updatedConversation,
                  ...(conversationsSettingsBulkActions.update
                    ? conversationsSettingsBulkActions.update[updatedConversation.title] ?? {}
                    : {}),
                  apiConfig: {
                    ...updatedConversation.apiConfig,
                    ...((conversationsSettingsBulkActions.update
                      ? conversationsSettingsBulkActions.update[updatedConversation.title] ?? {}
                      : {}
                    ).apiConfig ?? {}),
                    connectorId: connector?.id,
                    provider: config?.apiProvider,
                    model: config?.defaultModel,
                  },
                },
              },
            });
          } else {
            setConversationsSettingsBulkActions({
              ...conversationsSettingsBulkActions,
              create: {
                ...(conversationsSettingsBulkActions.create ?? {}),
                [updatedConversation.title]: updatedConversation,
              },
            });
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
            [updatedConversation.title]: updatedConversation,
          });
          if (selectedConversation.id !== '') {
            setConversationsSettingsBulkActions({
              ...conversationsSettingsBulkActions,
              update: {
                ...(conversationsSettingsBulkActions.update ?? {}),
                [updatedConversation.title]: {
                  ...updatedConversation,
                  ...(conversationsSettingsBulkActions.update
                    ? conversationsSettingsBulkActions.update[updatedConversation.title] ?? {}
                    : {}),
                  apiConfig: {
                    ...updatedConversation.apiConfig,
                    ...((conversationsSettingsBulkActions.update
                      ? conversationsSettingsBulkActions.update[updatedConversation.title] ?? {}
                      : {}
                    ).apiConfig ?? {}),
                    model,
                  },
                },
              },
            });
          } else {
            setConversationsSettingsBulkActions({
              ...conversationsSettingsBulkActions,
              create: {
                ...(conversationsSettingsBulkActions.create ?? {}),
                [updatedConversation.title]: updatedConversation,
              },
            });
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
    console.log('conversationSettings', { assistantStreamingEnabled });
    return (
      <>
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />

        <ConversationSelectorSettings
          selectedConversationTitle={selectedConversation?.title ?? ''}
          conversations={conversationSettings}
          onConversationDeleted={onConversationDeleted}
          onConversationSelectionChange={onConversationSelectionChange}
        />

        <EuiFormRow
          data-test-subj="prompt-field"
          display="rowCompressed"
          fullWidth
          label={i18n.SETTINGS_PROMPT_TITLE}
          helpText={i18n.SETTINGS_PROMPT_HELP_TEXT_TITLE}
        >
          <SelectSystemPrompt
            allSystemPrompts={allSystemPrompts}
            compressed
            conversation={selectedConversation}
            isEditing={true}
            isDisabled={isDisabled}
            onSystemPromptSelectionChange={handleOnSystemPromptSelectionChange}
            selectedPrompt={selectedSystemPrompt}
            showTitles={true}
            isSettingsModalVisible={true}
            setIsSettingsModalVisible={noop} // noop, already in settings
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
                defaultMessage="Kibana Connector to make requests with"
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
        <EuiSpacer size="xs" />
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_ALL_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_ALL_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />
        <EuiFormRow display="rowCompressed" hasChildLabel={false}>
          <EuiSwitch
            label={<EuiText size="xs">{i18n.STREAMING_TITLE}</EuiText>}
            checked={assistantStreamingEnabled}
            onChange={(e) => setAssistantStreamingEnabled(e.target.checked)}
            compressed
          />
        </EuiFormRow>
      </>
    );
  }
);
ConversationSettings.displayName = 'ConversationSettings';
