/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';
import React, { useMemo } from 'react';

import { HttpSetup } from '@kbn/core-http-browser';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { Conversation, Prompt } from '../../../..';
import * as i18n from './translations';

import { AIConnector } from '../../../connectorland/connector_selector';

import { ConversationSelectorSettings } from '../conversation_selector_settings';

import { ConversationsBulkActions } from '../../api';
import { useConversationDeleted } from './use_conversation_deleted';
import { ConversationSettingsEditor } from './conversation_settings_editor';
import { useConversationChanged } from './use_conversation_changed';
import { getConversationApiConfig } from '../../use_conversation/helpers';

export interface ConversationSettingsProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  allSystemPrompts: Prompt[];
  connectors?: AIConnector[];
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  defaultConnector?: AIConnector;
  assistantStreamingEnabled: boolean;
  http: HttpSetup;
  onSelectedConversationChange: (conversation?: Conversation) => void;
  selectedConversation?: Conversation;
  setAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  isDisabled?: boolean;
  isFlyoutMode: boolean;
}

/**
 * Settings for adding/removing conversation and configuring default system prompt and connector.
 */
export const ConversationSettings: React.FC<ConversationSettingsProps> = React.memo(
  ({
    allSystemPrompts,
    assistantStreamingEnabled,
    connectors,
    defaultConnector,
    selectedConversation,
    onSelectedConversationChange,
    conversationSettings,
    http,
    isDisabled = false,
    isFlyoutMode,
    setAssistantStreamingEnabled,
    setConversationSettings,
    conversationsSettingsBulkActions,
    setConversationsSettingsBulkActions,
  }) => {
    const onConversationSelectionChange = useConversationChanged({
      allSystemPrompts,
      conversationSettings,
      conversationsSettingsBulkActions,
      defaultConnector,
      setConversationSettings,
      setConversationsSettingsBulkActions,
      onSelectedConversationChange,
    });

    const onConversationDeleted = useConversationDeleted({
      conversationSettings,
      conversationsSettingsBulkActions,
      setConversationSettings,
      setConversationsSettingsBulkActions,
    });

    const selectedConversationWithApiConfig = useMemo(
      () =>
        selectedConversation
          ? {
              ...selectedConversation,
              ...getConversationApiConfig({
                allSystemPrompts,
                conversation: selectedConversation,
                connectors,
                defaultConnector,
              }),
            }
          : selectedConversation,
      [allSystemPrompts, connectors, defaultConnector, selectedConversation]
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
          selectedConversationTitle={selectedConversation?.title ?? ''}
          conversations={conversationSettings}
          onConversationDeleted={onConversationDeleted}
          onConversationSelectionChange={onConversationSelectionChange}
        />

        <ConversationSettingsEditor
          allSystemPrompts={allSystemPrompts}
          conversationSettings={conversationSettings}
          conversationsSettingsBulkActions={conversationsSettingsBulkActions}
          http={http}
          isDisabled={isDisabled}
          isFlyoutMode={isFlyoutMode}
          selectedConversation={selectedConversationWithApiConfig}
          setConversationSettings={setConversationSettings}
          setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
        />

        <EuiSpacer size="l" />
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_ALL_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_ALL_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />
        <EuiFormRow fullWidth display="rowCompressed" label={i18n.STREAMING_TITLE}>
          <EuiSwitch
            label={<EuiText size="xs">{i18n.STREAMING_HELP_TEXT_TITLE}</EuiText>}
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
