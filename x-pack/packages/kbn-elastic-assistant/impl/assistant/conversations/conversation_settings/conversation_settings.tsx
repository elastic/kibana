/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiLink, EuiTitle, EuiText, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { HttpSetup } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { noop } from 'lodash/fp';
import { Conversation, Prompt } from '../../../..';
import * as i18n from './translations';
import * as i18nModel from '../../../connectorland/models/model_selector/translations';

import { ConnectorSelector } from '../../../connectorland/connector_selector';
import { SelectSystemPrompt } from '../../prompt_editor/system_prompt/select_system_prompt';
import { ModelSelector } from '../../../connectorland/models/model_selector/model_selector';
import { UseAssistantContext } from '../../../assistant_context';
import { ConversationSelectorSettings } from '../conversation_selector_settings';
import { getDefaultSystemPrompt } from '../../use_conversation/helpers';
import { useLoadConnectors } from '../../../connectorland/use_load_connectors';

export interface ConversationSettingsProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  allSystemPrompts: Prompt[];
  conversationSettings: UseAssistantContext['conversations'];
  defaultConnectorId?: string;
  defaultProvider?: OpenAiProviderType;
  http: HttpSetup;
  onSelectedConversationChange: (conversation?: Conversation) => void;
  selectedConversation: Conversation | undefined;
  setUpdatedConversationSettings: React.Dispatch<
    React.SetStateAction<UseAssistantContext['conversations']>
  >;
  isDisabled?: boolean;
}

/**
 * Settings for adding/removing conversation and configuring default system prompt and connector.
 */
export const ConversationSettings: React.FC<ConversationSettingsProps> = React.memo(
  ({
    actionTypeRegistry,
    allSystemPrompts,
    defaultConnectorId,
    defaultProvider,
    selectedConversation,
    onSelectedConversationChange,
    conversationSettings,
    http,
    setUpdatedConversationSettings,
    isDisabled = false,
  }) => {
    const defaultSystemPrompt = useMemo(() => {
      return getDefaultSystemPrompt({ allSystemPrompts, conversation: undefined });
    }, [allSystemPrompts]);

    const selectedSystemPrompt = useMemo(() => {
      return getDefaultSystemPrompt({ allSystemPrompts, conversation: selectedConversation });
    }, [allSystemPrompts, selectedConversation]);

    const { data: connectors, isSuccess: areConnectorsFetched } = useLoadConnectors({ http });

    // Conversation callbacks
    // When top level conversation selection changes
    const onConversationSelectionChange = useCallback(
      (c?: Conversation | string) => {
        const isNew = typeof c === 'string';
        const newSelectedConversation: Conversation | undefined = isNew
          ? {
              id: c ?? '',
              messages: [],
              apiConfig: {
                connectorId: defaultConnectorId,
                provider: defaultProvider,
                defaultSystemPromptId: defaultSystemPrompt?.id,
              },
            }
          : c;

        if (newSelectedConversation != null) {
          setUpdatedConversationSettings((prev) => {
            return {
              ...prev,
              [newSelectedConversation.id]: newSelectedConversation,
            };
          });
        }

        onSelectedConversationChange(newSelectedConversation);
      },
      [
        defaultConnectorId,
        defaultProvider,
        defaultSystemPrompt?.id,
        onSelectedConversationChange,
        setUpdatedConversationSettings,
      ]
    );

    const onConversationDeleted = useCallback(
      (conversationId: string) => {
        setUpdatedConversationSettings((prev) => {
          const { [conversationId]: prevConversation, ...updatedConversations } = prev;
          if (prevConversation != null) {
            return updatedConversations;
          }
          return prev;
        });
      },
      [setUpdatedConversationSettings]
    );

    const handleOnSystemPromptSelectionChange = useCallback(
      (systemPromptId?: string | undefined) => {
        if (selectedConversation != null) {
          setUpdatedConversationSettings((prev) => ({
            ...prev,
            [selectedConversation.id]: {
              ...selectedConversation,
              apiConfig: {
                ...selectedConversation.apiConfig,
                defaultSystemPromptId: systemPromptId,
              },
            },
          }));
        }
      },
      [selectedConversation, setUpdatedConversationSettings]
    );

    const selectedConnector = useMemo(() => {
      const selectedConnectorId = selectedConversation?.apiConfig.connectorId;
      if (areConnectorsFetched) {
        return connectors?.find((c) => c.id === selectedConnectorId);
      }
      return undefined;
    }, [areConnectorsFetched, connectors, selectedConversation?.apiConfig.connectorId]);

    const selectedProvider = useMemo(
      () => selectedConversation?.apiConfig.provider,
      [selectedConversation?.apiConfig.provider]
    );

    const handleOnConnectorSelectionChange = useCallback(
      (connectorId: string, provider: OpenAiProviderType) => {
        if (selectedConversation != null) {
          setUpdatedConversationSettings((prev) => ({
            ...prev,
            [selectedConversation.id]: {
              ...selectedConversation,
              apiConfig: {
                ...selectedConversation.apiConfig,
                connectorId,
                provider,
              },
            },
          }));
        }
      },
      [selectedConversation, setUpdatedConversationSettings]
    );

    const selectedModel = useMemo(
      () => selectedConversation?.apiConfig.model,
      [selectedConversation?.apiConfig.model]
    );

    const handleOnModelSelectionChange = useCallback(
      (model?: string) => {
        if (selectedConversation != null) {
          setUpdatedConversationSettings((prev) => ({
            ...prev,
            [selectedConversation.id]: {
              ...selectedConversation,
              apiConfig: {
                ...selectedConversation.apiConfig,
                model,
              },
            },
          }));
        }
      },
      [selectedConversation, setUpdatedConversationSettings]
    );

    return (
      <>
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />

        <ConversationSelectorSettings
          selectedConversationId={selectedConversation?.id}
          allSystemPrompts={allSystemPrompts}
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
            isDisabled={selectedConversation == null}
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
            actionTypeRegistry={actionTypeRegistry}
            http={http}
            isDisabled={selectedConversation == null}
            onConnectorModalVisibilityChange={() => {}}
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
ConversationSettings.displayName = 'ConversationSettings';
