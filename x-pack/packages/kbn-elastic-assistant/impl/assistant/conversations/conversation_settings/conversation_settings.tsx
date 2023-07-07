/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiLink, EuiTitle, EuiText, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { HttpSetup } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { Conversation, Prompt } from '../../../..';
import * as i18n from './translations';
import * as i18nModel from '../../../connectorland/models/model_selector/translations';

import { ConversationSelector } from '../conversation_selector';
import { ConnectorSelector } from '../../../connectorland/connector_selector';
import { SelectSystemPrompt } from '../../prompt_editor/system_prompt/select_system_prompt';
import { ModelSelector } from '../../../connectorland/models/model_selector/model_selector';

export interface ConversationSettingsProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  allSystemPrompts: Prompt[];
  conversation: Conversation;
  http: HttpSetup;
  isDisabled?: boolean;
}

export const ConversationSettings: React.FC<ConversationSettingsProps> = React.memo(
  ({ actionTypeRegistry, allSystemPrompts, conversation, http, isDisabled = false }) => {
    const provider = useMemo(() => {
      return conversation.apiConfig?.provider;
    }, [conversation.apiConfig]);

    const selectedPrompt: Prompt | undefined = useMemo(() => {
      const convoDefaultSystemPromptId = conversation?.apiConfig.defaultSystemPromptId;
      if (convoDefaultSystemPromptId && allSystemPrompts) {
        return allSystemPrompts.find((prompt) => prompt.id === convoDefaultSystemPromptId);
      }
      return allSystemPrompts.find((prompt) => prompt.isNewConversationDefault);
    }, [conversation, allSystemPrompts]);

    return (
      <>
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />

        <ConversationSelector />

        <EuiFormRow
          data-test-subj="prompt-field"
          display="rowCompressed"
          fullWidth
          label={i18n.SETTINGS_PROMPT_TITLE}
          helpText={i18n.SETTINGS_PROMPT_HELP_TEXT_TITLE}
        >
          <SelectSystemPrompt
            compressed
            conversation={conversation}
            isEditing={true}
            selectedPrompt={selectedPrompt}
            showTitles={true}
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
            conversation={conversation}
            http={http}
            onConnectorModalVisibilityChange={() => {}}
          />
        </EuiFormRow>

        {provider === OpenAiProviderType.OpenAi && (
          <EuiFormRow
            data-test-subj="model-field"
            display="rowCompressed"
            label={i18nModel.MODEL_TITLE}
            helpText={i18nModel.HELP_LABEL}
          >
            <ModelSelector />
          </EuiFormRow>
        )}
      </>
    );
  }
);
ConversationSettings.displayName = 'ConversationSettings';
