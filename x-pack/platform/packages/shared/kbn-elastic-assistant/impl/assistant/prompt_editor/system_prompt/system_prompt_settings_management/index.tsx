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
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import type { PromptResponse } from '@kbn/elastic-assistant-common';
import { useConversationsUpdater } from '../../../settings/use_settings_updater/use_conversations_updater';
import type { SystemPromptSettings } from '../../../settings/use_settings_updater/use_system_prompt_updater';
import { useSystemPromptUpdater } from '../../../settings/use_settings_updater/use_system_prompt_updater';
import { useAssistantContext, useFetchCurrentUserConversations } from '../../../../..';
import { SYSTEM_PROMPT_TABLE_SESSION_STORAGE_KEY } from '../../../../assistant_context/constants';
import type { AIConnector } from '../../../../connectorland/connector_selector';
import { useFetchPrompts } from '../../../api';
import { Flyout } from '../../../common/components/assistant_settings_management/flyout';
import { useFlyoutModalVisibility } from '../../../common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import {
  getDefaultTableOptions,
  useSessionPagination,
} from '../../../common/components/assistant_settings_management/pagination/use_session_pagination';
import { CANCEL, DELETE, SETTINGS_UPDATED_TOAST_TITLE } from '../../../settings/translations';
import { SystemPromptEditor } from '../system_prompt_modal/system_prompt_editor';
import { SETTINGS_TITLE } from '../system_prompt_modal/translations';
import * as i18n from './translations';
import { useSystemPromptTable } from './use_system_prompt_table';

interface Props {
  connectors?: AIConnector[];
  defaultConnector?: AIConnector;
}

const SystemPromptSettingsManagementComponent = ({ connectors, defaultConnector }: Props) => {
  const {
    currentAppId,
    nameSpace,
    http,
    assistantAvailability: { isAssistantEnabled },
    toasts,
  } = useAssistantContext();

  const { data: allPrompts, refetch: refetchPrompts, isFetched: promptsLoaded } = useFetchPrompts();

  const {
    data: conversations,
    isFetched: conversationsLoaded,
    refetch: refetchConversations,
    setPaginationObserver,
  } = useFetchCurrentUserConversations({
    http,
    isAssistantEnabled,
    fields: ['id', 'title', 'apiConfig', 'updatedAt', 'createdBy', 'users'],
    isConversationOwner: true,
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
  const confirmModalTitleId = useGeneratedHtmlId();
  const confirmModalDescriptionId = useGeneratedHtmlId();

  const {
    conversationsSettingsBulkActions,
    resetConversationsSettings,
    saveConversationsSettings,
    setConversationsSettingsBulkActions,
  } = useConversationsUpdater(conversations, conversationsLoaded);

  const {
    onConversationSelectionChange,
    onNewConversationDefaultChange,
    onPromptContentChange,
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

  const handleSave = useCallback(
    async (param?: { callback?: () => void }) => {
      const { success, conversationUpdates } = await saveSystemPromptSettings();
      if (success) {
        await saveConversationsSettings({ bulkActions: conversationUpdates });
        await refetchPrompts();
        await refetchSystemPromptConversations();
        toasts?.addSuccess({
          iconType: 'check',
          title: SETTINGS_UPDATED_TOAST_TITLE,
        });
        param?.callback?.();
      }
    },
    [
      refetchPrompts,
      refetchSystemPromptConversations,
      saveConversationsSettings,
      saveSystemPromptSettings,
      toasts,
    ]
  );

  const onCancelClick = useCallback(() => {
    resetConversationsSettings();
    resetSystemPromptSettings();
  }, [resetConversationsSettings, resetSystemPromptSettings]);

  const onCreate = useCallback(() => {
    onSystemPromptSelect();
    openFlyout();
  }, [onSystemPromptSelect, openFlyout]);

  const onEditActionClicked = useCallback(
    (prompt: SystemPromptSettings) => {
      onSystemPromptSelect(prompt);
      openFlyout();
    },
    [onSystemPromptSelect, openFlyout]
  );

  const onDeleteActionClicked = useCallback(
    (prompt: PromptResponse) => {
      setDeletedPrompt(prompt);
      onSystemPromptDelete(prompt.id);
      openConfirmModal();
    },
    [onSystemPromptDelete, openConfirmModal]
  );

  const onDeleteCancelled = useCallback(() => {
    setDeletedPrompt(null);
    closeConfirmModal();
    onCancelClick();
  }, [closeConfirmModal, onCancelClick]);

  const onDeleteConfirmed = useCallback(() => {
    closeConfirmModal();
    handleSave({ callback: refetchAll });
  }, [closeConfirmModal, handleSave, refetchAll]);

  const onSaveCancelled = useCallback(() => {
    closeFlyout();
    onCancelClick();
  }, [closeFlyout, onCancelClick]);

  const onSaveConfirmed = useCallback(() => {
    closeFlyout();
    handleSave({ callback: refetchAll });
  }, [closeFlyout, handleSave, refetchAll]);

  const confirmationTitle = useMemo(
    () =>
      deletedPrompt?.name
        ? i18n.DELETE_SYSTEM_PROMPT_MODAL_TITLE(deletedPrompt?.name)
        : i18n.DELETE_SYSTEM_PROMPT_MODAL_DEFAULT_TITLE,
    [deletedPrompt?.name]
  );

  const { getColumns } = useSystemPromptTable();

  const { onTableChange, pagination, sorting } = useSessionPagination<SystemPromptSettings, true>({
    defaultTableOptions: getDefaultTableOptions<SystemPromptSettings>({ sortField: 'updatedAt' }),
    nameSpace,
    storageKey: SYSTEM_PROMPT_TABLE_SESSION_STORAGE_KEY,
  });

  const columns = useMemo(
    () =>
      getColumns({
        isActionsDisabled: isTableLoading,
        onEditActionClicked,
        onDeleteActionClicked,
        isDeleteEnabled: (prompt: PromptResponse) => prompt.isDefault !== true,
        isEditEnabled: () => true,
      }),
    [getColumns, isTableLoading, onEditActionClicked, onDeleteActionClicked]
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
          items={systemPromptSettings}
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
        saveButtonDisabled={
          selectedSystemPrompt?.name == null ||
          selectedSystemPrompt?.name === '' ||
          selectedSystemPrompt?.content === ''
        }
      >
        <SystemPromptEditor
          conversations={conversations}
          onConversationSelectionChange={onConversationSelectionChange}
          onNewConversationDefaultChange={onNewConversationDefaultChange}
          onPromptContentChange={onPromptContentChange}
          onSystemPromptDelete={onSystemPromptDelete}
          onSystemPromptSelect={onSystemPromptSelect}
          resetSettings={onCancelClick}
          selectedSystemPrompt={selectedSystemPrompt}
          setPaginationObserver={setPaginationObserver}
          systemPromptSettings={systemPromptSettings}
        />
      </Flyout>
      {deleteConfirmModalVisibility && deletedPrompt?.name && (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          aria-describedby={confirmModalDescriptionId}
          title={confirmationTitle}
          titleProps={{ id: confirmModalTitleId }}
          onCancel={onDeleteCancelled}
          onConfirm={onDeleteConfirmed}
          cancelButtonText={CANCEL}
          confirmButtonText={DELETE}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p id={confirmModalDescriptionId}>{i18n.DELETE_SYSTEM_PROMPT_MODAL_DESCRIPTION}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};

export const SystemPromptSettingsManagement = React.memo(SystemPromptSettingsManagementComponent);
