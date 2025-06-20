/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalFooter,
  EuiPage,
  EuiPageBody,
  EuiSplitPanel,
} from '@elastic/eui';

import styled from 'styled-components';
import { css } from '@emotion/react';
import { useConversationsUpdater } from './use_settings_updater/use_conversations_updater';
import { AIConnector } from '../../connectorland/connector_selector';
import { Conversation, useLoadConnectors } from '../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { TEST_IDS } from '../constants';
import { QuickPromptSettings, SystemPromptSettings } from '.';
import { QUICK_PROMPTS_TAB, SYSTEM_PROMPTS_TAB } from './const';
import { useFetchPrompts } from '../api/prompts/use_fetch_prompts';
import { useQuickPromptUpdater } from './use_settings_updater/use_quick_prompt_updater';
import { useSystemPromptUpdater } from './use_settings_updater/use_system_prompt_updater';

const StyledEuiModal = styled(EuiModal)`
  width: 800px;
  height: 575px;
`;

interface Props {
  defaultConnector?: AIConnector;
  onClose: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  onSave: (success: boolean) => Promise<void>;
  selectedConversationId?: string;
  onConversationSelected: ({ cId }: { cId: string }) => void;
  conversations: Record<string, Conversation>;
  conversationsLoaded: boolean;
  setPaginationObserver: (ref: HTMLDivElement) => void;
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
    conversations,
    conversationsLoaded,
    setPaginationObserver,
  }) => {
    const {
      currentAppId,
      http,
      assistantAvailability: { isAssistantEnabled },
      selectedSettingsTab,
      setSelectedSettingsTab,
      toasts,
    } = useAssistantContext();

    useEffect(() => {
      if (selectedSettingsTab == null) {
        setSelectedSettingsTab(QUICK_PROMPTS_TAB);
      }
    }, [selectedSettingsTab, setSelectedSettingsTab]);

    const { data: allPrompts, isFetched: promptsLoaded } = useFetchPrompts();

    const { data: connectors } = useLoadConnectors({
      http,
    });
    const {
      conversationsSettingsBulkActions,
      resetConversationsSettings,
      saveConversationsSettings,
      setConversationsSettingsBulkActions,
    } = useConversationsUpdater(conversations, conversationsLoaded);

    const {
      onPromptContentChange: onQuickPromptContentChange,
      onQuickPromptColorChange,
      onQuickPromptContextChange,
      onQuickPromptDelete,
      onQuickPromptSelect,
      quickPromptSettings,
      resetQuickPromptSettings,
      saveQuickPromptSettings,
      selectedQuickPrompt,
    } = useQuickPromptUpdater({
      allPrompts,
      currentAppId,
      http,
      promptsLoaded,
      toasts,
    });

    const {
      onConversationSelectionChange,
      onNewConversationDefaultChange,
      onPromptContentChange: onSystemPromptContentChange,
      onSystemPromptDelete,
      onSystemPromptSelect,
      refetchSystemPromptConversations,
      resetSystemPromptSettings,
      saveSystemPromptSettings,
      selectedSystemPrompt,
      systemPromptSettings,
    } = useSystemPromptUpdater({
      allPrompts,
      connectors,
      conversationsSettingsBulkActions,
      currentAppId,
      defaultConnector,
      http,
      isAssistantEnabled,
      setConversationsSettingsBulkActions,
      toasts,
    });

    const onCancelSystemPrompt = useCallback(() => {
      resetConversationsSettings();
      resetSystemPromptSettings();
    }, [resetConversationsSettings, resetSystemPromptSettings]);
    const handleSave = useCallback(async () => {
      let saveResult = false;
      if (selectedSettingsTab === QUICK_PROMPTS_TAB) {
        saveResult = await saveQuickPromptSettings();
      }
      if (selectedSettingsTab === SYSTEM_PROMPTS_TAB) {
        const { success: systemPromptSuccess, conversationUpdates } =
          await saveSystemPromptSettings();
        if (systemPromptSuccess) {
          saveResult = await saveConversationsSettings({ bulkActions: conversationUpdates });
        } else {
          saveResult = false;
        }
        await refetchSystemPromptConversations();
      }
      // onSave handles refetch (conversations and prompts), modal close and toast display
      await onSave(saveResult);
    }, [
      onSave,
      refetchSystemPromptConversations,
      saveConversationsSettings,
      saveQuickPromptSettings,
      saveSystemPromptSettings,
      selectedSettingsTab,
    ]);

    return (
      <StyledEuiModal data-test-subj={TEST_IDS.SETTINGS_MODAL} onClose={onClose}>
        <EuiPage paddingSize="none">
          <EuiPageBody paddingSize="none" panelled={true}>
            <EuiSplitPanel.Outer grow={true}>
              <EuiSplitPanel.Inner
                className="eui-scrollBar"
                grow={true}
                css={css`
                  max-height: 519px;
                  overflow-y: scroll;
                `}
              >
                {selectedSettingsTab === QUICK_PROMPTS_TAB && (
                  <QuickPromptSettings
                    onPromptContentChange={onQuickPromptContentChange}
                    onQuickPromptColorChange={onQuickPromptColorChange}
                    onQuickPromptContextChange={onQuickPromptContextChange}
                    onQuickPromptDelete={onQuickPromptDelete}
                    onQuickPromptSelect={onQuickPromptSelect}
                    resetSettings={resetQuickPromptSettings}
                    selectedQuickPrompt={selectedQuickPrompt}
                    quickPromptSettings={quickPromptSettings}
                  />
                )}
                {selectedSettingsTab === SYSTEM_PROMPTS_TAB && (
                  <SystemPromptSettings
                    conversations={conversations}
                    onConversationSelectionChange={onConversationSelectionChange}
                    onNewConversationDefaultChange={onNewConversationDefaultChange}
                    onPromptContentChange={onSystemPromptContentChange}
                    onSystemPromptDelete={onSystemPromptDelete}
                    onSystemPromptSelect={onSystemPromptSelect}
                    resetSettings={onCancelSystemPrompt}
                    selectedSystemPrompt={selectedSystemPrompt}
                    setPaginationObserver={setPaginationObserver}
                    systemPromptSettings={systemPromptSettings}
                  />
                )}
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
