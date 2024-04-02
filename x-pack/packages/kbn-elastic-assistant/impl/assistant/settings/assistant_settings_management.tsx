/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiFlexItem,
  EuiPageTemplate,
  EuiFlexGroup,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { Conversation, Prompt, QuickPrompt } from '../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { useSettingsUpdater } from './use_settings_updater/use_settings_updater';
import {
  AnonymizationSettings,
  ConversationSettings,
  EvaluationSettings,
  KnowledgeBaseSettings,
  QuickPromptSettings,
  SystemPromptSettings,
} from '.';
import { useLoadConnectors } from '../../connectorland/use_load_connectors';
import { getDefaultConnector } from '../helpers';

export const CONVERSATIONS_TAB = 'CONVERSATION_TAB' as const;
export const QUICK_PROMPTS_TAB = 'QUICK_PROMPTS_TAB' as const;
export const SYSTEM_PROMPTS_TAB = 'SYSTEM_PROMPTS_TAB' as const;
export const ANONYMIZATION_TAB = 'ANONYMIZATION_TAB' as const;
export const KNOWLEDGE_BASE_TAB = 'KNOWLEDGE_BASE_TAB' as const;
export const EVALUATION_TAB = 'EVALUATION_TAB' as const;

export type SettingsTabs =
  | typeof CONVERSATIONS_TAB
  | typeof QUICK_PROMPTS_TAB
  | typeof SYSTEM_PROMPTS_TAB
  | typeof ANONYMIZATION_TAB
  | typeof KNOWLEDGE_BASE_TAB
  | typeof EVALUATION_TAB;
interface Props {
  conversations: Record<string, Conversation>;
  selectedConversation: Conversation;
  setSelectedConversationId: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Modal for overall Assistant Settings, including conversation settings, quick prompts, system prompts,
 * anonymization, knowledge base, and evaluation via the `isModelEvaluationEnabled` feature flag.
 */
export const AssistantSettingsManagement: React.FC<Props> = React.memo(
  ({
    selectedConversation: defaultSelectedConversation,
    setSelectedConversationId,
    conversations,
  }) => {
    const {
      actionTypeRegistry,
      modelEvaluatorEnabled,
      http,
      selectedSettingsTab,
      setSelectedSettingsTab,
      toasts,
    } = useAssistantContext();

    // Connector details
    const { data: connectors } = useLoadConnectors({
      http,
    });
    const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);

    const [hasPendingChanges, setHasPendingChanges] = useState(false);

    const {
      conversationSettings,
      setConversationSettings,
      defaultAllow,
      defaultAllowReplacement,
      knowledgeBase,
      quickPromptSettings,
      systemPromptSettings,
      setUpdatedDefaultAllow,
      setUpdatedDefaultAllowReplacement,
      setUpdatedKnowledgeBaseSettings,
      setUpdatedQuickPromptSettings,
      setUpdatedSystemPromptSettings,
      saveSettings,
      resetSettings,
      conversationsSettingsBulkActions,
      setConversationsSettingsBulkActions,
    } = useSettingsUpdater(conversations);

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
        setSelectedConversation(conversationSettings[selectedConversation.title]);
      }
    }, [conversationSettings, selectedConversation]);

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

    const handleSave = useCallback(() => {
      // If the selected conversation is deleted, we need to select a new conversation to prevent a crash creating a conversation that already exists
      const isSelectedConversationDeleted =
        conversationSettings[defaultSelectedConversation.title] == null;
      const newSelectedConversationId: string | undefined = Object.keys(conversationSettings)[0];
      if (isSelectedConversationDeleted && newSelectedConversationId != null) {
        setSelectedConversationId(conversationSettings[newSelectedConversationId].title);
      }
      saveSettings();
      toasts?.addSuccess({
        iconType: 'check',
        title: i18n.SETTINGS_UPDATED_TOAST_TITLE,
      });
    }, [
      conversationSettings,
      defaultSelectedConversation.title,
      saveSettings,
      setSelectedConversationId,
      toasts,
    ]);

    const tabsConfig = useMemo(
      () => [
        {
          id: CONVERSATIONS_TAB,
          label: i18n.CONVERSATIONS_MENU_ITEM,
          prepend: <EuiIcon type="discuss" />,
        },
        {
          id: QUICK_PROMPTS_TAB,
          label: i18n.QUICK_PROMPTS_MENU_ITEM,
          prepend: <EuiIcon type="editorComment" />,
        },
        {
          id: SYSTEM_PROMPTS_TAB,
          label: i18n.SYSTEM_PROMPTS_MENU_ITEM,
          prepend: <EuiIcon type="editorComment" />,
        },
        {
          id: ANONYMIZATION_TAB,
          label: i18n.ANONYMIZATION_MENU_ITEM,
          prepend: <EuiIcon type="eyeClosed" />,
        },
        {
          id: KNOWLEDGE_BASE_TAB,
          label: i18n.KNOWLEDGE_BASE_MENU_ITEM,
          prepend: <EuiIcon type="notebookApp" />,
        },
        ...(modelEvaluatorEnabled
          ? [
              {
                id: EVALUATION_TAB,
                label: i18n.EVALUATION_MENU_ITEM,
                prepend: <EuiIcon type="crossClusterReplicationApp" />,
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
          pageTitle="Settings"
          tabs={tabs}
          paddingSize="none"
          // rightSideItems={[button]}
        />
        <EuiPageTemplate.Section
          paddingSize="l"
          css={css`
            padding-left: 0;
            padding-right: 0;
          `}
        >
          {selectedSettingsTab === CONVERSATIONS_TAB && (
            <ConversationSettings
              actionTypeRegistry={actionTypeRegistry}
              defaultConnector={defaultConnector}
              conversationSettings={conversationSettings}
              setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
              conversationsSettingsBulkActions={conversationsSettingsBulkActions}
              setConversationSettings={setConversationSettings}
              allSystemPrompts={systemPromptSettings}
              selectedConversation={selectedConversation}
              isDisabled={selectedConversation == null}
              onSelectedConversationChange={onHandleSelectedConversationChange}
              http={http}
            />
          )}
          {selectedSettingsTab === QUICK_PROMPTS_TAB && (
            <QuickPromptSettings
              quickPromptSettings={quickPromptSettings}
              onSelectedQuickPromptChange={onHandleSelectedQuickPromptChange}
              selectedQuickPrompt={selectedQuickPrompt}
              setUpdatedQuickPromptSettings={handleChange(setUpdatedQuickPromptSettings)}
            />
          )}
          {selectedSettingsTab === SYSTEM_PROMPTS_TAB && (
            <SystemPromptSettings
              conversationSettings={conversationSettings}
              defaultConnector={defaultConnector}
              systemPromptSettings={systemPromptSettings}
              onSelectedSystemPromptChange={onHandleSelectedSystemPromptChange}
              selectedSystemPrompt={selectedSystemPrompt}
              setConversationSettings={handleChange(setConversationSettings)}
              setConversationsSettingsBulkActions={handleChange(
                setConversationsSettingsBulkActions
              )}
              conversationsSettingsBulkActions={conversationsSettingsBulkActions}
              setUpdatedSystemPromptSettings={handleChange(setUpdatedSystemPromptSettings)}
            />
          )}
          {selectedSettingsTab === ANONYMIZATION_TAB && (
            <AnonymizationSettings
              defaultAllow={defaultAllow}
              defaultAllowReplacement={defaultAllowReplacement}
              pageSize={5}
              setUpdatedDefaultAllow={handleChange(setUpdatedDefaultAllow)}
              setUpdatedDefaultAllowReplacement={handleChange(setUpdatedDefaultAllowReplacement)}
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
          <EuiPageTemplate.BottomBar paddingSize="s" position="fixed">
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
                  onClick={handleSave}
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

AssistantSettingsManagement.displayName = 'AssistantSettingsNew';
