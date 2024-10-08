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
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { AIConnector } from '../../connectorland/connector_selector';
import { Conversation, useLoadConnectors } from '../../..';
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
import { useFetchAnonymizationFields } from '../api/anonymization_fields/use_fetch_anonymization_fields';
import {
  ANONYMIZATION_TAB,
  CONVERSATIONS_TAB,
  EVALUATION_TAB,
  KNOWLEDGE_BASE_TAB,
  QUICK_PROMPTS_TAB,
  SYSTEM_PROMPTS_TAB,
} from './const';
import { useFetchPrompts } from '../api/prompts/use_fetch_prompts';

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
  onConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => void;
  conversations: Record<string, Conversation>;
  conversationsLoaded: boolean;
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
    selectedConversationId: defaultSelectedConversationId,
    onConversationSelected,
    conversations,
    conversationsLoaded,
  }) => {
    const {
      assistantFeatures: { assistantModelEvaluation: modelEvaluatorEnabled },
      http,
      toasts,
      selectedSettingsTab,
      setSelectedSettingsTab,
    } = useAssistantContext();

    useEffect(() => {
      if (selectedSettingsTab == null) {
        setSelectedSettingsTab(CONVERSATIONS_TAB);
      }
    }, [selectedSettingsTab, setSelectedSettingsTab]);

    const { data: anonymizationFields, refetch: refetchAnonymizationFieldsResults } =
      useFetchAnonymizationFields();
    const { data: allPrompts, isFetched: promptsLoaded } = useFetchPrompts();

    const { data: connectors } = useLoadConnectors({
      http,
    });

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
      promptsBulkActions,
      saveSettings,
      conversationsSettingsBulkActions,
      updatedAnonymizationData,
      setConversationsSettingsBulkActions,
      anonymizationFieldsBulkActions,
      setAnonymizationFieldsBulkActions,
      setUpdatedAnonymizationData,
      setPromptsBulkActions,
      setUpdatedSystemPromptSettings,
    } = useSettingsUpdater(
      conversations,
      allPrompts,
      conversationsLoaded,
      promptsLoaded,
      anonymizationFields
    );

    // Local state for saving previously selected items so tab switching is friendlier
    // Conversation Selection State
    const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(
      defaultSelectedConversationId
    );
    const onHandleSelectedConversationChange = useCallback((conversation?: Conversation) => {
      setSelectedConversationId(conversation?.id);
    }, []);

    const selectedConversation = useMemo(
      () => (selectedConversationId ? conversationSettings[selectedConversationId] : undefined),
      [conversationSettings, selectedConversationId]
    );

    // Quick Prompt Selection State
    const [selectedQuickPrompt, setSelectedQuickPrompt] = useState<PromptResponse | undefined>();
    const onHandleSelectedQuickPromptChange = useCallback((quickPrompt?: PromptResponse) => {
      setSelectedQuickPrompt(quickPrompt);
    }, []);
    useEffect(() => {
      if (selectedQuickPrompt != null) {
        setSelectedQuickPrompt(
          quickPromptSettings.find((q) => q.name === selectedQuickPrompt.name)
        );
      }
    }, [quickPromptSettings, selectedQuickPrompt]);

    // System Prompt Selection State
    const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<PromptResponse | undefined>();
    const onHandleSelectedSystemPromptChange = useCallback((systemPrompt?: PromptResponse) => {
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
        defaultSelectedConversationId &&
        conversationSettings[defaultSelectedConversationId] == null;
      const newSelectedConversation: Conversation | undefined =
        Object.values(conversationSettings)[0];

      if (isSelectedConversationDeleted && newSelectedConversation != null) {
        onConversationSelected({
          cId: newSelectedConversation.id,
          cTitle: newSelectedConversation.title,
        });
      }
      const saveResult = await saveSettings();
      toasts?.addSuccess({
        iconType: 'check',
        title: i18n.SETTINGS_UPDATED_TOAST_TITLE,
      });
      if (
        (anonymizationFieldsBulkActions?.create?.length ?? 0) > 0 ||
        (anonymizationFieldsBulkActions?.update?.length ?? 0) > 0 ||
        (anonymizationFieldsBulkActions?.delete?.ids?.length ?? 0) > 0
      ) {
        await refetchAnonymizationFieldsResults();
      }
      await onSave(saveResult);
    }, [
      anonymizationFieldsBulkActions,
      conversationSettings,
      defaultSelectedConversationId,
      onConversationSelected,
      onSave,
      refetchAnonymizationFieldsResults,
      saveSettings,
      toasts,
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
                isSelected={!selectedSettingsTab || selectedSettingsTab === CONVERSATIONS_TAB}
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
                  max-height: 519px;
                  overflow-y: scroll;
                `}
              >
                {!selectedSettingsTab ||
                  (selectedSettingsTab === CONVERSATIONS_TAB && (
                    <ConversationSettings
                      connectors={connectors}
                      defaultConnector={defaultConnector}
                      conversationSettings={conversationSettings}
                      setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
                      conversationsSettingsBulkActions={conversationsSettingsBulkActions}
                      setConversationSettings={setConversationSettings}
                      allSystemPrompts={systemPromptSettings}
                      selectedConversation={selectedConversation}
                      isDisabled={selectedConversation == null}
                      assistantStreamingEnabled={assistantStreamingEnabled}
                      setAssistantStreamingEnabled={setUpdatedAssistantStreamingEnabled}
                      onSelectedConversationChange={onHandleSelectedConversationChange}
                      http={http}
                    />
                  ))}
                {selectedSettingsTab === QUICK_PROMPTS_TAB && (
                  <QuickPromptSettings
                    quickPromptSettings={quickPromptSettings}
                    onSelectedQuickPromptChange={onHandleSelectedQuickPromptChange}
                    selectedQuickPrompt={selectedQuickPrompt}
                    setUpdatedQuickPromptSettings={setUpdatedQuickPromptSettings}
                    setPromptsBulkActions={setPromptsBulkActions}
                    promptsBulkActions={promptsBulkActions}
                  />
                )}
                {selectedSettingsTab === SYSTEM_PROMPTS_TAB && (
                  <SystemPromptSettings
                    connectors={connectors}
                    conversationSettings={conversationSettings}
                    defaultConnector={defaultConnector}
                    systemPromptSettings={systemPromptSettings}
                    onSelectedSystemPromptChange={onHandleSelectedSystemPromptChange}
                    selectedSystemPrompt={selectedSystemPrompt}
                    setConversationSettings={setConversationSettings}
                    setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
                    conversationsSettingsBulkActions={conversationsSettingsBulkActions}
                    setUpdatedSystemPromptSettings={setUpdatedSystemPromptSettings}
                    setPromptsBulkActions={setPromptsBulkActions}
                    promptsBulkActions={promptsBulkActions}
                  />
                )}
                {selectedSettingsTab === ANONYMIZATION_TAB && (
                  <AnonymizationSettings
                    defaultPageSize={5}
                    anonymizationFields={updatedAnonymizationData}
                    anonymizationFieldsBulkActions={anonymizationFieldsBulkActions}
                    setAnonymizationFieldsBulkActions={setAnonymizationFieldsBulkActions}
                    setUpdatedAnonymizationData={setUpdatedAnonymizationData}
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
