/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiLink, EuiTitle, EuiText, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { HttpSetup } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { Conversation, Prompt } from '../../../..';
import * as i18n from './translations';
import * as i18nModel from '../../../connectorland/models/model_selector/translations';

import { ConnectorSelector } from '../../../connectorland/connector_selector';
import { SelectSystemPrompt } from '../../prompt_editor/system_prompt/select_system_prompt';
import { ModelSelector } from '../../../connectorland/models/model_selector/model_selector';
import { UseAssistantContext } from '../../../assistant_context';
import { ConversationSelectorSettings } from '../conversation_selector_settings';

const getDefaultSystemPromptFromConversation = ({
  conversation,
  allSystemPrompts,
}: {
  conversation?: Conversation;
  allSystemPrompts: Prompt[];
}) => {
  const convoDefaultSystemPromptId = conversation?.apiConfig.defaultSystemPromptId;
  if (convoDefaultSystemPromptId && allSystemPrompts) {
    return (
      allSystemPrompts.find((prompt) => prompt.id === convoDefaultSystemPromptId) ??
      allSystemPrompts[0]
    );
  }
  return allSystemPrompts.find((prompt) => prompt.isNewConversationDefault) ?? allSystemPrompts[0];
};

export interface ConversationSettingsProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  allSystemPrompts: Prompt[];
  conversationSettings: UseAssistantContext['conversations'];
  http: HttpSetup;
  onSelectedConversationChange?: (conversation?: Conversation) => void;
  selectedConversation?: Conversation;
  setUpdatedConversationSettings: React.Dispatch<
    React.SetStateAction<UseAssistantContext['conversations']>
  >;
  isDisabled?: boolean;
}

export const ConversationSettings: React.FC<ConversationSettingsProps> = React.memo(
  ({
    actionTypeRegistry,
    allSystemPrompts,
    selectedConversation: defaultConversation,
    onSelectedConversationChange,
    conversationSettings,
    http,
    setUpdatedConversationSettings,
    isDisabled = false,
  }) => {
    // Defaults
    const defaultSystemPrompt = useMemo(() => {
      return allSystemPrompts.find((systemPrompt) => systemPrompt.isNewConversationDefault);
    }, [allSystemPrompts]);

    // Form Options
    // Conversation
    const [selectedConversation, setSelectedConversation] = useState<Conversation | undefined>(
      defaultConversation
    );
    // System Prompt
    const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<Prompt | undefined>(() => {
      return getDefaultSystemPromptFromConversation({
        conversation: defaultConversation,
        allSystemPrompts,
      });
    });
    // Connector
    const [selectedConnectorId, setSelectedConnectorId] = useState(() => {
      return defaultConversation?.apiConfig?.connectorId;
    });
    const [selectedProvider, setSelectedProvider] = useState(() => {
      return defaultConversation?.apiConfig?.provider;
    });
    // Model
    const [selectedModel, setSelectedModel] = useState(() => {
      return defaultConversation?.apiConfig?.model;
    });

    // Conversation callbacks
    // When top level conversation selection changes
    const onConversationSelectionChange = useCallback(
      (c?: Conversation | string) => {
        const newConversation: Conversation | undefined =
          typeof c === 'string'
            ? {
                id: c ?? '',
                messages: [],
                apiConfig: {
                  connectorId: undefined,
                  provider: undefined,
                  defaultSystemPromptId: defaultSystemPrompt?.id,
                },
              }
            : c;

        setSelectedConversation(newConversation);
        setSelectedSystemPrompt(
          newConversation
            ? getDefaultSystemPromptFromConversation({
                conversation: newConversation,
                allSystemPrompts,
              })
            : allSystemPrompts.find((prompt) => prompt.id === defaultSystemPrompt?.id)
        );
        setSelectedConnectorId(newConversation?.apiConfig.connectorId ?? undefined);
        setSelectedProvider(newConversation?.apiConfig.provider ?? undefined);
        setSelectedModel(newConversation?.apiConfig.model ?? undefined);
        onSelectedConversationChange?.(newConversation);
      },
      [allSystemPrompts, defaultSystemPrompt?.id, onSelectedConversationChange]
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
      (systemPromptId?: string) => {
        setSelectedSystemPrompt(allSystemPrompts.find((prompt) => prompt.id === systemPromptId));
      },
      [allSystemPrompts]
    );

    const handleOnConnectorSelectionChange = useCallback(
      (connectorId: string, provider: OpenAiProviderType) => {
        setSelectedConnectorId(connectorId);
        setSelectedProvider(provider);
      },
      []
    );

    const handleOnModelSelectionChange = useCallback((model?: string) => {
      setSelectedModel(model);
    }, []);

    // useEffects
    // Update conversation on any field change since editing is in place
    useEffect(() => {
      if (selectedConversation != null) {
        setUpdatedConversationSettings((prev) => {
          return {
            ...prev,
            [selectedConversation.id]: {
              ...selectedConversation,
              id: selectedConversation.id,
              apiConfig: {
                ...selectedConversation.apiConfig,
                connectorId: selectedConnectorId,
                defaultSystemPromptId: selectedSystemPrompt?.id,
                model: selectedModel,
                provider: selectedProvider,
              },
            },
          };
        });
      }
    }, [
      selectedConnectorId,
      selectedConversation,
      selectedModel,
      selectedProvider,
      selectedSystemPrompt?.id,
      setUpdatedConversationSettings,
    ]);

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
            conversation={defaultConversation}
            isEditing={true}
            selectedPrompt={selectedSystemPrompt}
            showTitles={true}
            onSystemPromptSelectionChange={handleOnSystemPromptSelectionChange}
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
            selectedConnectorId={selectedConnectorId}
            http={http}
            onConnectorModalVisibilityChange={() => {}}
            onConnectorSelectionChange={handleOnConnectorSelectionChange}
          />
        </EuiFormRow>

        {selectedProvider === OpenAiProviderType.OpenAi && (
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
