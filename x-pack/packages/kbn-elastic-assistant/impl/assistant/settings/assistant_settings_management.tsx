/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { Conversation, Prompt, QuickPrompt } from '../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { useSettingsUpdater } from './use_settings_updater/use_settings_updater';
import { KnowledgeBaseSettings, EvaluationSettings } from '.';
import { useLoadConnectors } from '../../connectorland/use_load_connectors';
import { getDefaultConnector } from '../helpers';
import { useFetchAnonymizationFields } from '../api/anonymization_fields/use_fetch_anonymization_fields';
import { ConnectorsSettingsManagement } from '../../connectorland/connector_settings_management';
import { ConversationSettingsManagement } from '../conversations/conversation_settings_management';
import { QuickPromptSettingsManagement } from '../quick_prompts/quick_prompt_settings_management';
import { SystemPromptSettingsManagement } from '../prompt_editor/system_prompt/system_prompt_settings_management';
import { AnonymizationSettingsManagement } from '../../data_anonymization/settings/anonymization_settings_management';

import {
  ANONYMIZATION_TAB,
  CONNECTORS_TAB,
  CONVERSATIONS_TAB,
  EVALUATION_TAB,
  KNOWLEDGE_BASE_TAB,
  QUICK_PROMPTS_TAB,
  SYSTEM_PROMPTS_TAB,
} from './const';

interface Props {
  conversations: Record<string, Conversation>;
  conversationsLoaded: boolean;
  selectedConversation: Conversation;
  isFlyoutMode: boolean;
  refetchConversations: () => void;
}

/**
 * Modal for overall Assistant Settings, including conversation settings, quick prompts, system prompts,
 * anonymization, knowledge base, and evaluation via the `isModelEvaluationEnabled` feature flag.
 */
export const AssistantSettingsManagement: React.FC<Props> = React.memo(
  ({
    conversations,
    conversationsLoaded,
    isFlyoutMode,
    refetchConversations,
    selectedConversation: defaultSelectedConversation,
  }) => {
    const {
      assistantFeatures: { assistantModelEvaluation: modelEvaluatorEnabled },
      http,
      selectedSettingsTab,
      setSelectedSettingsTab,
      toasts,
    } = useAssistantContext();

    const { data: anonymizationFields } = useFetchAnonymizationFields();

    const { data: connectors } = useLoadConnectors({
      http,
    });
    const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);

    const [hasPendingChanges, setHasPendingChanges] = useState(false);
    const { euiTheme } = useEuiTheme();
    const headerIconShadow = useEuiShadow('s');

    const {
      conversationSettings,
      setConversationSettings,
      knowledgeBase,
      quickPromptSettings,
      systemPromptSettings,
      assistantStreamingEnabled,
      setUpdatedAssistantStreamingEnabled,
      setUpdatedKnowledgeBaseSettings,
      setUpdatedQuickPromptSettings,
      setUpdatedSystemPromptSettings,
      saveSettings,
      conversationsSettingsBulkActions,
      updatedAnonymizationData,
      setConversationsSettingsBulkActions,
      anonymizationFieldsBulkActions,
      setAnonymizationFieldsBulkActions,
      setUpdatedAnonymizationData,
      resetSettings,
    } = useSettingsUpdater(
      conversations,
      conversationsLoaded,
      anonymizationFields ?? { page: 0, perPage: 0, total: 0, data: [] }
    );

    // Local state for saving previously selected items so tab switching is friendlier
    // Conversation Selection State
    const [selectedConversation, setSelectedConversation] = useState<Conversation | undefined>(
      () => {
        return conversationSettings[defaultSelectedConversation.title];
      }
    );

    const onHandleSelectedConversationChange = useCallback((conversation?: Conversation) => {
      setSelectedConversation(conversation);
    }, []);

    useEffect(() => {
      if (selectedConversation != null) {
        setSelectedConversation(
          // conversationSettings has title as key, sometime has id as key
          conversationSettings[selectedConversation.id] ||
            conversationSettings[selectedConversation.title]
        );
      }
    }, [conversationSettings, selectedConversation]);

    useEffect(() => {
      if (selectedSettingsTab == null) {
        setSelectedSettingsTab(CONNECTORS_TAB);
      }
    }, [selectedSettingsTab, setSelectedSettingsTab]);

    // Quick Prompt Selection State
    const [selectedQuickPrompt, setSelectedQuickPrompt] = useState<QuickPrompt | undefined>();
    const onHandleSelectedQuickPromptChange = useCallback((quickPrompt?: QuickPrompt) => {
      setSelectedQuickPrompt(quickPrompt);
    }, []);
    useEffect(() => {
      if (selectedQuickPrompt != null) {
        setSelectedQuickPrompt(
          quickPromptSettings.find((q) => q.title === selectedQuickPrompt.title)
        );
      }
    }, [quickPromptSettings, selectedQuickPrompt]);

    // System Prompt Selection State
    const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<Prompt | undefined>();
    const onHandleSelectedSystemPromptChange = useCallback((systemPrompt?: Prompt) => {
      setSelectedSystemPrompt(systemPrompt);
    }, []);
    useEffect(() => {
      if (selectedSystemPrompt != null) {
        setSelectedSystemPrompt(systemPromptSettings.find((p) => p.id === selectedSystemPrompt.id));
      }
    }, [selectedSystemPrompt, systemPromptSettings]);

    const handleSave = useCallback(
      async (shouldRefetchConversation?: boolean) => {
        await saveSettings();
        toasts?.addSuccess({
          iconType: 'check',
          title: i18n.SETTINGS_UPDATED_TOAST_TITLE,
        });
        setHasPendingChanges(false);
        if (shouldRefetchConversation) {
          refetchConversations();
        }
      },
      [refetchConversations, saveSettings, toasts]
    );

    const onSaveButtonClicked = useCallback(() => {
      handleSave(true);
    }, [handleSave]);

    const tabsConfig = useMemo(
      () => [
        {
          id: CONNECTORS_TAB,
          label: i18n.CONNECTORS_MENU_ITEM,
        },
        {
          id: CONVERSATIONS_TAB,
          label: i18n.CONVERSATIONS_MENU_ITEM,
        },
        {
          id: SYSTEM_PROMPTS_TAB,
          label: i18n.SYSTEM_PROMPTS_MENU_ITEM,
        },
        {
          id: QUICK_PROMPTS_TAB,
          label: i18n.QUICK_PROMPTS_MENU_ITEM,
        },
        {
          id: ANONYMIZATION_TAB,
          label: i18n.ANONYMIZATION_MENU_ITEM,
        },
        {
          id: KNOWLEDGE_BASE_TAB,
          label: i18n.KNOWLEDGE_BASE_MENU_ITEM,
        },
        ...(modelEvaluatorEnabled
          ? [
              {
                id: EVALUATION_TAB,
                label: i18n.EVALUATION_MENU_ITEM,
              },
            ]
          : []),
      ],
      [modelEvaluatorEnabled]
    );

    const tabs = useMemo(() => {
      return tabsConfig.map((t) => ({
        ...t,
        'data-test-subj': `settingsPageTab-${t.id}`,
        onClick: () => setSelectedSettingsTab(t.id),
        isSelected: t.id === selectedSettingsTab,
      }));
    }, [setSelectedSettingsTab, selectedSettingsTab, tabsConfig]);

    const handleChange = useCallback(
      (callback) => (value: unknown) => {
        setHasPendingChanges(true);
        callback(value);
      },
      []
    );

    const onCancelClick = useCallback(() => {
      resetSettings();
      setHasPendingChanges(false);
    }, [resetSettings]);
    return (
      <>
        <EuiPageTemplate.Header
          pageTitle={
            <>
              <EuiAvatar
                iconType="logoSecurity"
                iconSize="m"
                color="plain"
                name={i18n.SECURITY_AI_SETTINGS}
                css={css`
                  ${headerIconShadow};
                  margin-right: ${euiTheme.base * 0.75}px;
                `}
              />
              <EuiTitle size="m" className="eui-displayInlineBlock">
                <h2>{i18n.SECURITY_AI_SETTINGS}</h2>
              </EuiTitle>
            </>
          }
          tabs={tabs}
          paddingSize="none"
        />
        <EuiPageTemplate.Section
          paddingSize="none"
          css={css`
            padding-left: 0;
            padding-right: 0;
            padding-top: ${euiTheme.base * 0.75}px;
            padding-bottom: ${euiTheme.base * 0.75}px;
          `}
        >
          {selectedSettingsTab === CONNECTORS_TAB && <ConnectorsSettingsManagement />}
          {selectedSettingsTab === CONVERSATIONS_TAB && (
            <ConversationSettingsManagement
              allSystemPrompts={systemPromptSettings}
              assistantStreamingEnabled={assistantStreamingEnabled}
              connectors={connectors}
              conversationSettings={conversationSettings}
              conversationsLoaded={conversationsLoaded}
              conversationsSettingsBulkActions={conversationsSettingsBulkActions}
              defaultConnector={defaultConnector}
              handleSave={handleSave}
              isFlyoutMode={isFlyoutMode}
              onCancelClick={onCancelClick}
              onSelectedConversationChange={onHandleSelectedConversationChange}
              selectedConversation={selectedConversation}
              setAssistantStreamingEnabled={handleChange(setUpdatedAssistantStreamingEnabled)}
              setConversationSettings={setConversationSettings}
              setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
            />
          )}
          {selectedSettingsTab === SYSTEM_PROMPTS_TAB && (
            <SystemPromptSettingsManagement
              connectors={connectors}
              conversationSettings={conversationSettings}
              conversationsSettingsBulkActions={conversationsSettingsBulkActions}
              defaultConnector={defaultConnector}
              handleSave={handleSave}
              onCancelClick={onCancelClick}
              onSelectedSystemPromptChange={onHandleSelectedSystemPromptChange}
              resetSettings={resetSettings}
              selectedSystemPrompt={selectedSystemPrompt}
              setConversationSettings={setConversationSettings}
              setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
              setUpdatedSystemPromptSettings={setUpdatedSystemPromptSettings}
              systemPromptSettings={systemPromptSettings}
            />
          )}
          {selectedSettingsTab === QUICK_PROMPTS_TAB && (
            <QuickPromptSettingsManagement
              handleSave={handleSave}
              onCancelClick={onCancelClick}
              onSelectedQuickPromptChange={onHandleSelectedQuickPromptChange}
              quickPromptSettings={quickPromptSettings}
              resetSettings={resetSettings}
              selectedQuickPrompt={selectedQuickPrompt}
              setUpdatedQuickPromptSettings={setUpdatedQuickPromptSettings}
            />
          )}
          {selectedSettingsTab === ANONYMIZATION_TAB && (
            <AnonymizationSettingsManagement
              anonymizationFields={updatedAnonymizationData}
              anonymizationFieldsBulkActions={anonymizationFieldsBulkActions}
              defaultPageSize={5}
              setAnonymizationFieldsBulkActions={handleChange(setAnonymizationFieldsBulkActions)}
              setUpdatedAnonymizationData={handleChange(setUpdatedAnonymizationData)}
            />
          )}
          {selectedSettingsTab === KNOWLEDGE_BASE_TAB && (
            <KnowledgeBaseSettings
              knowledgeBase={knowledgeBase}
              setUpdatedKnowledgeBaseSettings={handleChange(setUpdatedKnowledgeBaseSettings)}
            />
          )}
          {selectedSettingsTab === EVALUATION_TAB && <EvaluationSettings />}
        </EuiPageTemplate.Section>
        {hasPendingChanges && (
          <EuiPageTemplate.BottomBar paddingSize="s" position="fixed" data-test-subj="bottom-bar">
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  color="text"
                  iconType="cross"
                  data-test-subj="cancel-button"
                  onClick={onCancelClick}
                >
                  {i18n.CANCEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  type="submit"
                  data-test-subj="save-button"
                  onClick={onSaveButtonClicked}
                  iconType="check"
                  fill
                >
                  {i18n.SAVE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageTemplate.BottomBar>
        )}
      </>
    );
  }
);

AssistantSettingsManagement.displayName = 'AssistantSettingsManagement';
