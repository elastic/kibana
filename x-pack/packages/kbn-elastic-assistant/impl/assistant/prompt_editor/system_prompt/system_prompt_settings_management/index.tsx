/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiInMemoryTable,
  EuiPanel,
  EuiConfirmModal,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { PromptResponse } from '@kbn/elastic-assistant-common';
import {
  Conversation,
  mergeBaseWithPersistedConversations,
  useAssistantContext,
  useFetchCurrentUserConversations,
} from '../../../../..';
import { SYSTEM_PROMPT_TABLE_SESSION_STORAGE_KEY } from '../../../../assistant_context/constants';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { FetchConversationsResponse, useFetchPrompts } from '../../../api';
import { Flyout } from '../../../common/components/assistant_settings_management/flyout';
import { useFlyoutModalVisibility } from '../../../common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import {
  DEFAULT_TABLE_OPTIONS,
  useSessionPagination,
} from '../../../common/components/assistant_settings_management/pagination/use_session_pagination';
import { CANCEL, DELETE, SETTINGS_UPDATED_TOAST_TITLE } from '../../../settings/translations';
import { useSettingsUpdater } from '../../../settings/use_settings_updater/use_settings_updater';
import { SystemPromptEditor } from '../system_prompt_modal/system_prompt_editor';
import { SETTINGS_TITLE } from '../system_prompt_modal/translations';
import { useSystemPromptEditor } from '../system_prompt_modal/use_system_prompt_editor';
import * as i18n from './translations';
import { useSystemPromptTable } from './use_system_prompt_table';

interface Props {
  connectors: AIConnector[] | undefined;
  defaultConnector?: AIConnector;
}

const SystemPromptSettingsManagementComponent = ({ connectors, defaultConnector }: Props) => {
  const {
    nameSpace,
    http,
    assistantAvailability: { isAssistantEnabled },
    baseConversations,
    toasts,
  } = useAssistantContext();

  const onFetchedConversations = useCallback(
    (conversationsData: FetchConversationsResponse): Record<string, Conversation> =>
      mergeBaseWithPersistedConversations(baseConversations, conversationsData),
    [baseConversations]
  );

  const { data: allPrompts, refetch: refetchPrompts, isFetched: promptsLoaded } = useFetchPrompts();

  const {
    data: conversations,
    isFetched: conversationsLoaded,
    refetch: refetchConversations,
  } = useFetchCurrentUserConversations({
    http,
    onFetch: onFetchedConversations,
    isAssistantEnabled,
  });

  const refetchAll = useCallback(() => {
    refetchPrompts();
    refetchConversations();
  }, [refetchPrompts, refetchConversations]);

  const isTableLoading = !conversationsLoaded || !promptsLoaded;
  const { isFlyoutOpen: editFlyoutVisible, openFlyout, closeFlyout } = useFlyoutModalVisibility();
  const {
    isFlyoutOpen: deleteConfirmModalVisibility,
    openFlyout: openConfirmModal,
    closeFlyout: closeConfirmModal,
  } = useFlyoutModalVisibility();
  const [deletedPrompt, setDeletedPrompt] = useState<PromptResponse | null>();

  const {
    conversationSettings,
    setConversationSettings,
    systemPromptSettings,
    setUpdatedSystemPromptSettings,
    conversationsSettingsBulkActions,
    setConversationsSettingsBulkActions,
    resetSettings,
    saveSettings,
    promptsBulkActions,
    setPromptsBulkActions,
  } = useSettingsUpdater(conversations, allPrompts, conversationsLoaded, promptsLoaded);

  // System Prompt Selection State
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<PromptResponse | undefined>();

  const onSelectedSystemPromptChange = useCallback((systemPrompt?: PromptResponse) => {
    setSelectedSystemPrompt(systemPrompt);
  }, []);

  useEffect(() => {
    if (selectedSystemPrompt != null) {
      setSelectedSystemPrompt(systemPromptSettings.find((p) => p.id === selectedSystemPrompt.id));
    }
  }, [selectedSystemPrompt, systemPromptSettings]);

  const handleSave = useCallback(
    async (param?: { callback?: () => void }) => {
      await saveSettings();
      toasts?.addSuccess({
        iconType: 'check',
        title: SETTINGS_UPDATED_TOAST_TITLE,
      });
      param?.callback?.();
    },
    [saveSettings, toasts]
  );

  const onCancelClick = useCallback(() => {
    resetSettings();
  }, [resetSettings]);

  const onCreate = useCallback(() => {
    onSelectedSystemPromptChange({
      id: '',
      content: '',
      name: '',
      promptType: 'system',
    });
    openFlyout();
  }, [onSelectedSystemPromptChange, openFlyout]);

  const { onSystemPromptSelectionChange, onSystemPromptDeleted } = useSystemPromptEditor({
    setUpdatedSystemPromptSettings,
    onSelectedSystemPromptChange,
    promptsBulkActions,
    setPromptsBulkActions,
  });

  const onEditActionClicked = useCallback(
    (prompt: PromptResponse) => {
      onSystemPromptSelectionChange(prompt);
      openFlyout();
    },
    [onSystemPromptSelectionChange, openFlyout]
  );

  const onDeleteActionClicked = useCallback(
    (prompt: PromptResponse) => {
      setDeletedPrompt(prompt);
      onSystemPromptDeleted(prompt.id);
      openConfirmModal();
    },
    [onSystemPromptDeleted, openConfirmModal]
  );

  const onDeleteCancelled = useCallback(() => {
    setDeletedPrompt(null);
    closeConfirmModal();
    onCancelClick();
  }, [closeConfirmModal, onCancelClick]);

  const onDeleteConfirmed = useCallback(() => {
    closeConfirmModal();
    handleSave({ callback: refetchAll });
    setConversationsSettingsBulkActions({});
  }, [closeConfirmModal, handleSave, refetchAll, setConversationsSettingsBulkActions]);

  const onSaveCancelled = useCallback(() => {
    closeFlyout();
    onCancelClick();
  }, [closeFlyout, onCancelClick]);

  const onSaveConfirmed = useCallback(() => {
    closeFlyout();
    handleSave({ callback: refetchAll });
    setConversationsSettingsBulkActions({});
  }, [closeFlyout, handleSave, refetchAll, setConversationsSettingsBulkActions]);

  const confirmationTitle = useMemo(
    () =>
      deletedPrompt?.name
        ? i18n.DELETE_SYSTEM_PROMPT_MODAL_TITLE(deletedPrompt?.name)
        : i18n.DELETE_SYSTEM_PROMPT_MODAL_DEFAULT_TITLE,
    [deletedPrompt?.name]
  );

  const { getColumns, getSystemPromptsList } = useSystemPromptTable();

  const { onTableChange, pagination, sorting } = useSessionPagination({
    defaultTableOptions: DEFAULT_TABLE_OPTIONS,
    nameSpace,
    storageKey: SYSTEM_PROMPT_TABLE_SESSION_STORAGE_KEY,
  });

  const columns = useMemo(
    () =>
      getColumns({ isActionsDisabled: isTableLoading, onEditActionClicked, onDeleteActionClicked }),
    [getColumns, isTableLoading, onEditActionClicked, onDeleteActionClicked]
  );
  const systemPromptListItems = useMemo(
    () =>
      getSystemPromptsList({
        connectors,
        conversationSettings,
        defaultConnector,
        systemPromptSettings,
      }),
    [getSystemPromptsList, connectors, conversationSettings, defaultConnector, systemPromptSettings]
  );

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText size="m">{i18n.SYSTEM_PROMPTS_TABLE_SETTINGS_DESCRIPTION}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="plusInCircle" onClick={onCreate} disabled={isTableLoading}>
              {i18n.CREATE_SYSTEM_PROMPT_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <EuiInMemoryTable
          columns={columns}
          items={systemPromptListItems}
          onTableChange={onTableChange}
          pagination={pagination}
          sorting={sorting}
        />
      </EuiPanel>
      <Flyout
        flyoutVisible={editFlyoutVisible}
        title={SETTINGS_TITLE}
        onClose={onSaveCancelled}
        onSaveCancelled={onSaveCancelled}
        onSaveConfirmed={onSaveConfirmed}
        saveButtonDisabled={selectedSystemPrompt?.name == null || selectedSystemPrompt?.name === ''}
      >
        <SystemPromptEditor
          connectors={connectors}
          conversationSettings={conversationSettings}
          onSelectedSystemPromptChange={onSelectedSystemPromptChange}
          selectedSystemPrompt={selectedSystemPrompt}
          setUpdatedSystemPromptSettings={setUpdatedSystemPromptSettings}
          setConversationSettings={setConversationSettings}
          systemPromptSettings={systemPromptSettings}
          conversationsSettingsBulkActions={conversationsSettingsBulkActions}
          setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
          defaultConnector={defaultConnector}
          resetSettings={resetSettings}
          promptsBulkActions={promptsBulkActions}
          setPromptsBulkActions={setPromptsBulkActions}
        />
      </Flyout>
      {deleteConfirmModalVisibility && deletedPrompt?.name && (
        <EuiConfirmModal
          aria-labelledby={confirmationTitle}
          title={confirmationTitle}
          titleProps={{ id: deletedPrompt?.id ?? undefined }}
          onCancel={onDeleteCancelled}
          onConfirm={onDeleteConfirmed}
          cancelButtonText={CANCEL}
          confirmButtonText={DELETE}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>{i18n.DELETE_SYSTEM_PROMPT_MODAL_DESCRIPTION}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};

export const SystemPromptSettingsManagement = React.memo(SystemPromptSettingsManagementComponent);
