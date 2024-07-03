/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiConfirmModal, EuiInMemoryTable } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { PromptResponse } from '@kbn/elastic-assistant-common';
import { Conversation } from '../../../assistant_context/types';
import { ConversationTableItem, useConversationsTable } from './use_conversations_table';
import { ConversationStreamingSwitch } from '../conversation_settings/conversation_streaming_switch';
import { AIConnector } from '../../../connectorland/connector_selector';
import * as i18n from './translations';

import { ConversationsBulkActions } from '../../api';
import { useAssistantContext } from '../../../assistant_context';
import { useConversationDeleted } from '../conversation_settings/use_conversation_deleted';
import { useFlyoutModalVisibility } from '../../common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import { Flyout } from '../../common/components/assistant_settings_management/flyout';
import { CANCEL, DELETE } from '../../settings/translations';
import { ConversationSettingsEditor } from '../conversation_settings/conversation_settings_editor';
import { useConversationChanged } from '../conversation_settings/use_conversation_changed';
import { CONVERSATION_TABLE_SESSION_STORAGE_KEY } from '../../../assistant_context/constants';
import { useSessionPagination } from '../../common/components/assistant_settings_management/pagination/use_session_pagination';
import { DEFAULT_PAGE_SIZE } from '../../settings/const';
interface Props {
  allSystemPrompts: PromptResponse[];
  assistantStreamingEnabled: boolean;
  connectors: AIConnector[] | undefined;
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  conversationsLoaded: boolean;
  defaultConnector?: AIConnector;
  handleSave: (shouldRefetchConversation?: boolean) => void;
  isDisabled?: boolean;
  isFlyoutMode: boolean;
  onCancelClick: () => void;
  setAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  selectedConversation: Conversation | undefined;
  onSelectedConversationChange: (conversation?: Conversation) => void;
}

export const DEFAULT_TABLE_OPTIONS = {
  page: { size: DEFAULT_PAGE_SIZE, index: 0 },
  sort: { field: 'createdAt', direction: 'desc' as const },
};

const ConversationSettingsManagementComponent: React.FC<Props> = ({
  allSystemPrompts,
  assistantStreamingEnabled,
  connectors,
  defaultConnector,
  conversationSettings,
  conversationsSettingsBulkActions,
  conversationsLoaded,
  handleSave,
  isDisabled,
  isFlyoutMode,
  onSelectedConversationChange,
  onCancelClick,
  selectedConversation,
  setAssistantStreamingEnabled,
  setConversationSettings,
  setConversationsSettingsBulkActions,
}) => {
  const { http, nameSpace, actionTypeRegistry } = useAssistantContext();

  const {
    isFlyoutOpen: editFlyoutVisible,
    openFlyout: openEditFlyout,
    closeFlyout: closeEditFlyout,
  } = useFlyoutModalVisibility();
  const [deletedConversation, setDeletedConversation] = useState<ConversationTableItem | null>();

  const {
    isFlyoutOpen: deleteConfirmModalVisibility,
    openFlyout: openConfirmModal,
    closeFlyout: closeConfirmModal,
  } = useFlyoutModalVisibility();

  const onConversationSelectionChange = useConversationChanged({
    allSystemPrompts,
    conversationSettings,
    conversationsSettingsBulkActions,
    defaultConnector,
    setConversationSettings,
    setConversationsSettingsBulkActions,
    onSelectedConversationChange,
  });

  const onEditActionClicked = useCallback(
    (rowItem: ConversationTableItem) => {
      openEditFlyout();
      onConversationSelectionChange(rowItem);
    },
    [onConversationSelectionChange, openEditFlyout]
  );

  const onConversationDeleted = useConversationDeleted({
    conversationSettings,
    conversationsSettingsBulkActions,
    setConversationSettings,
    setConversationsSettingsBulkActions,
  });

  const onDeleteActionClicked = useCallback(
    (rowItem: ConversationTableItem) => {
      setDeletedConversation(rowItem);
      onConversationDeleted(rowItem.title);

      closeEditFlyout();
      openConfirmModal();
    },
    [closeEditFlyout, onConversationDeleted, openConfirmModal]
  );

  const onDeleteConfirmed = useCallback(() => {
    if (Object.keys(conversationsSettingsBulkActions).length === 0) {
      return;
    }
    closeConfirmModal();
    handleSave(true);
    setConversationsSettingsBulkActions({});
  }, [
    closeConfirmModal,
    conversationsSettingsBulkActions,
    handleSave,
    setConversationsSettingsBulkActions,
  ]);

  const onDeleteCancelled = useCallback(() => {
    setDeletedConversation(null);
    closeConfirmModal();
    onCancelClick();
  }, [closeConfirmModal, onCancelClick]);

  const { getConversationsList, getColumns } = useConversationsTable();

  const { onTableChange, pagination, sorting } = useSessionPagination({
    nameSpace,
    storageKey: CONVERSATION_TABLE_SESSION_STORAGE_KEY,
    defaultTableOptions: DEFAULT_TABLE_OPTIONS,
  });

  const conversationOptions = getConversationsList({
    allSystemPrompts,
    actionTypeRegistry,
    connectors,
    conversations: conversationSettings,
    defaultConnector,
  });

  const onSaveCancelled = useCallback(() => {
    closeEditFlyout();
    onCancelClick();
  }, [closeEditFlyout, onCancelClick]);

  const onSaveConfirmed = useCallback(() => {
    closeEditFlyout();
    handleSave(true);
    setConversationsSettingsBulkActions({});
  }, [closeEditFlyout, handleSave, setConversationsSettingsBulkActions]);

  const columns = useMemo(
    () =>
      getColumns({
        conversations: conversationSettings,
        onDeleteActionClicked,
        onEditActionClicked,
      }),
    [conversationSettings, getColumns, onDeleteActionClicked, onEditActionClicked]
  );

  const confirmationTitle = useMemo(
    () =>
      deletedConversation?.title
        ? i18n.DELETE_CONVERSATION_CONFIRMATION_TITLE(deletedConversation?.title)
        : i18n.DELETE_CONVERSATION_CONFIRMATION_DEFAULT_TITLE,
    [deletedConversation?.title]
  );

  if (!conversationsLoaded) {
    return null;
  }

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <ConversationStreamingSwitch
          assistantStreamingEnabled={assistantStreamingEnabled}
          setAssistantStreamingEnabled={setAssistantStreamingEnabled}
          compressed={false}
        />
        <EuiSpacer size="m" />
        <EuiInMemoryTable
          items={conversationOptions}
          columns={columns}
          pagination={pagination}
          sorting={sorting}
          onTableChange={onTableChange}
        />
      </EuiPanel>
      {editFlyoutVisible && (
        <Flyout
          flyoutVisible={editFlyoutVisible}
          onClose={onSaveCancelled}
          onSaveConfirmed={onSaveConfirmed}
          onSaveCancelled={onSaveCancelled}
          title={selectedConversation?.title ?? i18n.CONVERSATIONS_FLYOUT_DEFAULT_TITLE}
        >
          <ConversationSettingsEditor
            allSystemPrompts={allSystemPrompts}
            conversationSettings={conversationSettings}
            conversationsSettingsBulkActions={conversationsSettingsBulkActions}
            http={http}
            isDisabled={isDisabled}
            isFlyoutMode={isFlyoutMode}
            selectedConversation={selectedConversation}
            setConversationSettings={setConversationSettings}
            setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
          />
        </Flyout>
      )}
      {deleteConfirmModalVisibility && deletedConversation?.title && (
        <EuiConfirmModal
          aria-labelledby={confirmationTitle}
          title={confirmationTitle}
          titleProps={{ id: deletedConversation?.id ?? undefined }}
          onCancel={onDeleteCancelled}
          onConfirm={onDeleteConfirmed}
          cancelButtonText={CANCEL}
          confirmButtonText={DELETE}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p />
        </EuiConfirmModal>
      )}
    </>
  );
};

export const ConversationSettingsManagement = React.memo(ConversationSettingsManagementComponent);

ConversationSettingsManagement.displayName = 'ConversationSettingsManagement';
