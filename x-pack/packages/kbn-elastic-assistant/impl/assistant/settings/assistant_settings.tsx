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
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/gen_ai/constants';
import { Conversation, Prompt, QuickPrompt } from '../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { AnonymizationSettings } from '../../data_anonymization/settings/anonymization_settings';
import { QuickPromptSettings } from '../quick_prompts/quick_prompt_settings/quick_prompt_settings';
import { SystemPromptSettings } from '../prompt_editor/system_prompt/system_prompt_modal/system_prompt_settings';
import { AdvancedSettings } from './advanced_settings/advanced_settings';
import { ConversationSettings } from '../conversations/conversation_settings/conversation_settings';
import { TEST_IDS } from '../constants';
import { useSettingsUpdater } from './use_settings_updater/use_settings_updater';

const StyledEuiModal = styled(EuiModal)`
  width: 800px;
  height: 575px;
`;

export const CONVERSATIONS_TAB = 'CONVERSATION_TAB' as const;
export const QUICK_PROMPTS_TAB = 'QUICK_PROMPTS_TAB' as const;
export const SYSTEM_PROMPTS_TAB = 'SYSTEM_PROMPTS_TAB' as const;
export const ANONYMIZATION_TAB = 'ANONYMIZATION_TAB' as const;
export const FUNCTIONS_TAB = 'FUNCTIONS_TAB' as const;
export const ADVANCED_TAB = 'ADVANCED_TAB' as const;

export type SettingsTabs =
  | typeof CONVERSATIONS_TAB
  | typeof QUICK_PROMPTS_TAB
  | typeof SYSTEM_PROMPTS_TAB
  | typeof ANONYMIZATION_TAB
  | typeof FUNCTIONS_TAB
  | typeof ADVANCED_TAB;
interface Props {
  defaultConnectorId?: string;
  defaultProvider?: OpenAiProviderType;
  onClose: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  onSave: () => void;
  selectedConversation: Conversation;
  setSelectedConversationId: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Modal for overall Assistant Settings, including conversation settings, quick prompts, system prompts,
 * anonymization, functions (coming soon!), and advanced settings.
 */
export const AssistantSettings: React.FC<Props> = React.memo(
  ({
    defaultConnectorId,
    defaultProvider,
    onClose,
    onSave,
    selectedConversation: defaultSelectedConversation,
    setSelectedConversationId,
  }) => {
    const { actionTypeRegistry, http, selectedSettingsTab, setSelectedSettingsTab } =
      useAssistantContext();
    const {
      conversationSettings,
      defaultAllow,
      defaultAllowReplacement,
      quickPromptSettings,
      systemPromptSettings,
      setUpdatedConversationSettings,
      setUpdatedDefaultAllow,
      setUpdatedDefaultAllowReplacement,
      setUpdatedQuickPromptSettings,
      setUpdatedSystemPromptSettings,
      saveSettings,
    } = useSettingsUpdater();

    // Local state for saving previously selected items so tab switching is friendlier
    // Conversation Selection State
    const [selectedConversation, setSelectedConversation] = useState<Conversation | undefined>(
      () => {
        return conversationSettings[defaultSelectedConversation.id];
      }
    );
    const onHandleSelectedConversationChange = useCallback((conversation?: Conversation) => {
      setSelectedConversation(conversation);
    }, []);
    useEffect(() => {
      if (selectedConversation != null) {
        setSelectedConversation(conversationSettings[selectedConversation.id]);
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
        conversationSettings[defaultSelectedConversation.id] == null;
      const newSelectedConversationId: string | undefined = Object.keys(conversationSettings)[0];
      if (isSelectedConversationDeleted && newSelectedConversationId != null) {
        setSelectedConversationId(conversationSettings[newSelectedConversationId].id);
      }
      saveSettings();
      onSave();
    }, [
      conversationSettings,
      defaultSelectedConversation.id,
      onSave,
      saveSettings,
      setSelectedConversationId,
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
              >
                <EuiIcon type="eyeClosed" size="l" />
              </EuiKeyPadMenuItem>
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
                    defaultConnectorId={defaultConnectorId}
                    defaultProvider={defaultProvider}
                    conversationSettings={conversationSettings}
                    setUpdatedConversationSettings={setUpdatedConversationSettings}
                    allSystemPrompts={systemPromptSettings}
                    actionTypeRegistry={actionTypeRegistry}
                    selectedConversation={selectedConversation}
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
                    systemPromptSettings={systemPromptSettings}
                    onSelectedSystemPromptChange={onHandleSelectedSystemPromptChange}
                    selectedSystemPrompt={selectedSystemPrompt}
                    setUpdatedConversationSettings={setUpdatedConversationSettings}
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
                {selectedSettingsTab === FUNCTIONS_TAB && <></>}
                {selectedSettingsTab === ADVANCED_TAB && <AdvancedSettings />}
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
                  <EuiButtonEmpty size="s" onClick={onClose}>
                    {i18n.CANCEL}
                  </EuiButtonEmpty>

                  <EuiButton size="s" type="submit" onClick={handleSave} fill>
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
