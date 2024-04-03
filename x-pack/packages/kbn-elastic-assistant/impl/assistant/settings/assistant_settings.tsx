/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiModal,
  EuiModalFooter,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiPage,
  EuiPageBody,
  EuiPageSidebar,
  EuiSplitPanel,
} from '@elastic/eui';

// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import { css } from '@emotion/react';
import { AIConnector } from '../../connectorland/connector_selector';
import { Conversation, Prompt, QuickPrompt } from '../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { TEST_IDS } from '../constants';
import { useSettingsUpdater } from './use_settings_updater/use_settings_updater';
import {
  AnonymizationSettings,
  ConversationSettings,
  EvaluationSettings,
  KnowledgeBaseSettings,
  QuickPromptSettings,
  SystemPromptSettings,
} from '.';

const StyledEuiModal = styled(EuiModal)`
  width: 800px;
  height: 575px;
`;

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
  defaultConnector?: AIConnector;
  onClose: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  onSave: (success: boolean) => Promise<void>;
  selectedConversation: Conversation;
  onConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => void;
  conversations: Record<string, Conversation>;
}

/**
 * Modal for overall Assistant Settings, including conversation settings, quick prompts, system prompts,
 * anonymization, knowledge base, and evaluation via the `isModelEvaluationEnabled` feature flag.
 */
export const AssistantSettings: React.FC<Props> = React.memo(
  ({
    defaultConnector,
    onClose,
    onSave,
    selectedConversation: defaultSelectedConversation,
    onConversationSelected,
    conversations,
  }) => {
    const {
      actionTypeRegistry,
      modelEvaluatorEnabled,
      http,
      selectedSettingsTab,
      setSelectedSettingsTab,
    } = useAssistantContext();

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

    const handleSave = useCallback(async () => {
      // If the selected conversation is deleted, we need to select a new conversation to prevent a crash creating a conversation that already exists
      const isSelectedConversationDeleted =
        conversationSettings[defaultSelectedConversation.title] == null;
      const newSelectedConversation: Conversation | undefined =
        Object.values(conversationSettings)[0];
      if (isSelectedConversationDeleted && newSelectedConversation != null) {
        onConversationSelected({
          cId: newSelectedConversation.id,
          cTitle: newSelectedConversation.title,
        });
      }
      const saveResult = await saveSettings();
      await onSave(saveResult);
    }, [
      conversationSettings,
      defaultSelectedConversation.title,
      onConversationSelected,
      onSave,
      saveSettings,
    ]);

    return (
      <StyledEuiModal data-test-subj={TEST_IDS.SETTINGS_MODAL} onClose={onClose}>
        <EuiPage paddingSize="none">
          <EuiPageSidebar
            paddingSize="xs"
            css={css`
              min-inline-size: unset !important;
              max-width: 104px;
            `}
          >
            <EuiKeyPadMenu>
              <EuiKeyPadMenuItem
                id={CONVERSATIONS_TAB}
                label={i18n.CONVERSATIONS_MENU_ITEM}
                isSelected={selectedSettingsTab === CONVERSATIONS_TAB}
                onClick={() => setSelectedSettingsTab(CONVERSATIONS_TAB)}
                data-test-subj={`${CONVERSATIONS_TAB}-button`}
              >
                <>
                  <EuiIcon
                    type="editorComment"
                    size="xl"
                    css={css`
                      position: relative;
                      top: -10px;
                    `}
                  />
                  <EuiIcon
                    type="editorComment"
                    size="l"
                    css={css`
                      position: relative;
                      transform: rotateY(180deg);
                      top: -7px;
                    `}
                  />
                </>
              </EuiKeyPadMenuItem>
              <EuiKeyPadMenuItem
                id={QUICK_PROMPTS_TAB}
                label={i18n.QUICK_PROMPTS_MENU_ITEM}
                isSelected={selectedSettingsTab === QUICK_PROMPTS_TAB}
                onClick={() => setSelectedSettingsTab(QUICK_PROMPTS_TAB)}
                data-test-subj={`${QUICK_PROMPTS_TAB}-button`}
              >
                <>
                  <EuiIcon type="editorComment" size="xxl" />
                  <EuiIcon
                    type="bolt"
                    size="s"
                    color="warning"
                    css={css`
                      position: absolute;
                      top: 11px;
                      left: 14px;
                    `}
                  />
                </>
              </EuiKeyPadMenuItem>
              <EuiKeyPadMenuItem
                id={SYSTEM_PROMPTS_TAB}
                label={i18n.SYSTEM_PROMPTS_MENU_ITEM}
                isSelected={selectedSettingsTab === SYSTEM_PROMPTS_TAB}
                onClick={() => setSelectedSettingsTab(SYSTEM_PROMPTS_TAB)}
                data-test-subj={`${SYSTEM_PROMPTS_TAB}-button`}
              >
                <EuiIcon type="editorComment" size="xxl" />
                <EuiIcon
                  type="storage"
                  size="s"
                  color="success"
                  css={css`
                    position: absolute;
                    top: 11px;
                    left: 14px;
                  `}
                />
              </EuiKeyPadMenuItem>
              <EuiKeyPadMenuItem
                id={ANONYMIZATION_TAB}
                label={i18n.ANONYMIZATION_MENU_ITEM}
                isSelected={selectedSettingsTab === ANONYMIZATION_TAB}
                onClick={() => setSelectedSettingsTab(ANONYMIZATION_TAB)}
                data-test-subj={`${ANONYMIZATION_TAB}-button`}
              >
                <EuiIcon type="eyeClosed" size="l" />
              </EuiKeyPadMenuItem>
              <EuiKeyPadMenuItem
                id={KNOWLEDGE_BASE_TAB}
                label={i18n.KNOWLEDGE_BASE_MENU_ITEM}
                isSelected={selectedSettingsTab === KNOWLEDGE_BASE_TAB}
                onClick={() => setSelectedSettingsTab(KNOWLEDGE_BASE_TAB)}
                data-test-subj={`${KNOWLEDGE_BASE_TAB}-button`}
              >
                <EuiIcon type="notebookApp" size="l" />
              </EuiKeyPadMenuItem>
              {modelEvaluatorEnabled && (
                <EuiKeyPadMenuItem
                  id={EVALUATION_TAB}
                  label={i18n.EVALUATION_MENU_ITEM}
                  isSelected={selectedSettingsTab === EVALUATION_TAB}
                  onClick={() => setSelectedSettingsTab(EVALUATION_TAB)}
                  data-test-subj={`${EVALUATION_TAB}-button`}
                >
                  <EuiIcon type="crossClusterReplicationApp" size="l" />
                </EuiKeyPadMenuItem>
              )}
            </EuiKeyPadMenu>
          </EuiPageSidebar>
          <EuiPageBody paddingSize="none" panelled={true}>
            <EuiSplitPanel.Outer grow={true}>
              <EuiSplitPanel.Inner
                className="eui-scrollBar"
                grow={true}
                css={css`
                  max-height: 550px;
                  overflow-y: scroll;
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
                    setUpdatedQuickPromptSettings={setUpdatedQuickPromptSettings}
                  />
                )}
                {selectedSettingsTab === SYSTEM_PROMPTS_TAB && (
                  <SystemPromptSettings
                    conversationSettings={conversationSettings}
                    defaultConnector={defaultConnector}
                    systemPromptSettings={systemPromptSettings}
                    onSelectedSystemPromptChange={onHandleSelectedSystemPromptChange}
                    selectedSystemPrompt={selectedSystemPrompt}
                    setConversationSettings={setConversationSettings}
                    setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
                    conversationsSettingsBulkActions={conversationsSettingsBulkActions}
                    setUpdatedSystemPromptSettings={setUpdatedSystemPromptSettings}
                  />
                )}
                {selectedSettingsTab === ANONYMIZATION_TAB && (
                  <AnonymizationSettings
                    defaultAllow={defaultAllow}
                    defaultAllowReplacement={defaultAllowReplacement}
                    pageSize={5}
                    setUpdatedDefaultAllow={setUpdatedDefaultAllow}
                    setUpdatedDefaultAllowReplacement={setUpdatedDefaultAllowReplacement}
                  />
                )}
                {selectedSettingsTab === KNOWLEDGE_BASE_TAB && (
                  <KnowledgeBaseSettings
                    knowledgeBase={knowledgeBase}
                    setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
                  />
                )}
                {selectedSettingsTab === EVALUATION_TAB && <EvaluationSettings />}
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner
                grow={false}
                color="subdued"
                css={css`
                  padding: 8px;
                `}
              >
                <EuiModalFooter
                  css={css`
                    padding: 4px;
                  `}
                >
                  <EuiButtonEmpty size="s" data-test-subj="cancel-button" onClick={onClose}>
                    {i18n.CANCEL}
                  </EuiButtonEmpty>

                  <EuiButton
                    size="s"
                    type="submit"
                    data-test-subj="save-button"
                    onClick={handleSave}
                    fill
                  >
                    {i18n.SAVE}
                  </EuiButton>
                </EuiModalFooter>
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </EuiPageBody>
        </EuiPage>
      </StyledEuiModal>
    );
  }
);

AssistantSettings.displayName = 'AssistantSettings';
