/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { HttpSetup } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { Conversation, Prompt } from '../../..';
import * as i18n from '../translations';
import { ConnectorSelector } from '../../connectorland/connector_selector';
import { SelectSystemPrompt } from '../prompt_editor/system_prompt/select_system_prompt';

export interface ConversationSettingsPopoverProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  conversation: Conversation;
  http: HttpSetup;
  isDisabled?: boolean;
  allSystemPrompts: Prompt[];
}

export const ConversationSettingsPopover: React.FC<ConversationSettingsPopoverProps> = React.memo(
  ({ actionTypeRegistry, conversation, http, isDisabled = false, allSystemPrompts }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // So we can hide the settings popover when the connector modal is displayed
    const popoverPanelRef = useRef<HTMLElement | null>(null);

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

    const closeSettingsHandler = useCallback(() => {
      setIsSettingsOpen(false);
    }, []);

    // Hide settings panel when modal is visible (to keep visual clutter minimal)
    const onDescendantModalVisibilityChange = useCallback((isVisible: boolean) => {
      if (popoverPanelRef.current) {
        popoverPanelRef.current.style.visibility = isVisible ? 'hidden' : 'visible';
      }
    }, []);

    return (
      <EuiPopover
        button={
          <EuiToolTip position="right" content={i18n.SETTINGS_TITLE}>
            <EuiButtonIcon
              disabled={isDisabled}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              iconType="controlsVertical"
              aria-label={i18n.SETTINGS_TITLE}
              data-test-subj="assistant-settings-button"
            />
          </EuiToolTip>
        }
        isOpen={isSettingsOpen}
        closePopover={closeSettingsHandler}
        anchorPosition="rightCenter"
        panelRef={(el) => (popoverPanelRef.current = el)}
      >
        <EuiPopoverTitle>{i18n.SETTINGS_TITLE}</EuiPopoverTitle>
        <div style={{ width: '300px' }}>
          <EuiFormRow
            data-test-subj="model-field"
            label={i18n.SETTINGS_CONNECTOR_TITLE}
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
              onConnectorModalVisibilityChange={onDescendantModalVisibilityChange}
            />
          </EuiFormRow>

          {provider === OpenAiProviderType.OpenAi && <></>}

          <EuiFormRow
            data-test-subj="prompt-field"
            label={i18n.SETTINGS_PROMPT_TITLE}
            helpText={i18n.SETTINGS_PROMPT_HELP_TEXT_TITLE}
          >
            <SelectSystemPrompt
              conversation={conversation}
              fullWidth={false}
              isEditing={true}
              onSystemPromptModalVisibilityChange={onDescendantModalVisibilityChange}
              selectedPrompt={selectedPrompt}
              showTitles={true}
            />
          </EuiFormRow>
        </div>
      </EuiPopover>
    );
  }
);
ConversationSettingsPopover.displayName = 'ConversationSettingsPopover';
