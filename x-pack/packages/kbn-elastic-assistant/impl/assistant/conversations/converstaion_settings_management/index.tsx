/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiSpacer,
  EuiBadge,
  EuiLink,
  EuiBasicTableColumn,
  EuiConfirmModal,
  EuiInMemoryTable,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedDate } from '@kbn/i18n-react';
import { Conversation } from '../../../assistant_context/types';
import {
  ConversationTableItem,
  useConversationsList,
} from '../conversation_selector_settings/use_conversation_selector_settings';
import { ConversationStreamingSwitch } from '../conversation_settings/conversation_streaming_switch';
import { AIConnector } from '../../../connectorland/connector_selector';
import { RowActions } from '../../common/components/assisttant_settings_management/row_actions';
import * as i18n from './translations';

import { Prompt } from '../../types';
import { ConversationsBulkActions } from '../../api';
import { useAssistantContext } from '../../../assistant_context';
import { useConversationDeleted } from '../conversation_settings/use_conversation_deleted';
import { useFlyoutModalVisibility } from '../../common/components/assisttant_settings_management/flyout/use_flyout_modal_visibility';
import { Flyout } from '../../common/components/assisttant_settings_management/flyout';
import { CANCEL, DELETE } from '../../settings/translations';
import { ConversationSettingsEditor } from '../conversation_settings/conversation_settings_editor';

interface Props {
  actionTypeRegistry: ActionTypeRegistryContract;
  allSystemPrompts: Prompt[];
  assistantStreamingEnabled: boolean;
  connectors: AIConnector[] | undefined;
  conversations: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  handleSave: () => void;
  isDisabled?: boolean;
  isFlyoutMode: boolean;
  refetchConversations: () => void;
  resetSettings: () => void;
  setAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  selectedConversation: Conversation | undefined;
  onSelectedConversationChange: (conversation?: Conversation) => void;
}

const ConversationSettingsManagementComponent: React.FC<Props> = ({
  actionTypeRegistry,
  allSystemPrompts,
  assistantStreamingEnabled,
  connectors,
  conversations,
  conversationsSettingsBulkActions,
  handleSave,
  isDisabled,
  isFlyoutMode,
  onSelectedConversationChange,
  refetchConversations,
  resetSettings,
  selectedConversation,
  setAssistantStreamingEnabled,
  setConversationSettings,
  setConversationsSettingsBulkActions,
}) => {
  const { http } = useAssistantContext();
  const {
    isFlyoutOpen: editFlyoutVisible,
    openFlyout: openEditFlyout,
    closeFlyout: closeEditFlyout,
  } = useFlyoutModalVisibility();
  const [deleteConversation, setDeleteConversation] = useState<ConversationTableItem | null>();

  const {
    isFlyoutOpen: deleteConfirmModalVisibility,
    openFlyout: openConfirmModal,
    closeFlyout: closeConfirmModal,
  } = useFlyoutModalVisibility();

  const onEditActionClicked = useCallback(
    (rowItem: ConversationTableItem) => {
      openEditFlyout();
      onSelectedConversationChange(rowItem);
    },
    [onSelectedConversationChange, openEditFlyout]
  );

  const onConversationDeleted = useConversationDeleted({
    conversationSettings: conversations,
    conversationsSettingsBulkActions,
    setConversationSettings,
    setConversationsSettingsBulkActions,
  });

  const onDeleteActionClicked = useCallback(
    (rowItem: ConversationTableItem) => {
      setDeleteConversation(rowItem);
      closeEditFlyout();
      openConfirmModal();
    },
    [closeEditFlyout, openConfirmModal]
  );

  const onDeleteConfirmed = useCallback(() => {
    if (!deleteConversation) return;
    onConversationDeleted(deleteConversation.title);
    closeConfirmModal();
    refetchConversations();
  }, [deleteConversation, onConversationDeleted, closeConfirmModal, refetchConversations]);

  const onDeleteCancelled = useCallback(() => {
    setDeleteConversation(null);
    closeConfirmModal();
    resetSettings();
  }, [closeConfirmModal, resetSettings]);

  const conversationOptions = useConversationsList({
    allSystemPrompts,
    actionTypeRegistry,
    connectors,
    conversations,
  });

  const onEditFlyoutClosed = useCallback(() => {
    closeEditFlyout();
    resetSettings();
  }, [closeEditFlyout, resetSettings]);

  const onEditFlyoutSaved = useCallback(() => {
    handleSave();
    closeEditFlyout();
    refetchConversations();
  }, [closeEditFlyout, handleSave, refetchConversations]);

  const columns: Array<EuiBasicTableColumn<ConversationTableItem>> = useMemo(
    () => [
      {
        name: i18n.CONVERSATIONS_TABLE_COLUMN_TYPE,
        render: (conversation: ConversationTableItem) => (
          <EuiLink onClick={() => onEditActionClicked(conversation)}>{conversation.title}</EuiLink>
        ),
      },
      {
        field: 'systemPrompt',
        name: i18n.CONVERSATIONS_TABLE_COLUMN_SYSTEM_PROMPT,
        render: (systemPrompt: ConversationTableItem['systemPrompt']) =>
          systemPrompt ? <EuiBadge color="hollow">{systemPrompt}</EuiBadge> : null,
      },
      {
        field: 'actionType',
        name: i18n.CONVERSATIONS_TABLE_COLUMN_CONNECTOR,
        render: (actionType: ConversationTableItem['actionType']) =>
          actionType ? <EuiBadge color="hollow">{actionType}</EuiBadge> : null,
      },
      {
        field: 'updatedAt',
        name: i18n.CONVERSATIONS_TABLE_COLUMN_UPDATED_AT,
        render: (updatedAt: ConversationTableItem['updatedAt']) =>
          updatedAt ? (
            <EuiBadge color="hollow">
              <FormattedDate
                value={new Date(updatedAt)}
                format="DD/MM/YYYY"
                year="numeric"
                month="2-digit"
                day="numeric"
              />
            </EuiBadge>
          ) : null,
      },
      {
        name: i18n.CONVERSATIONS_TABLE_COLUMN_ACTIONS,
        actions: [
          {
            name: i18n.CONVERSATIONS_TABLE_COLUMN_ACTIONS,
            render: (conversation: ConversationTableItem) => {
              return (
                <RowActions<ConversationTableItem>
                  rowItem={conversation}
                  onEdit={onEditActionClicked}
                  onDelete={onDeleteActionClicked}
                />
              );
            },
          },
        ],
      },
    ],
    [onDeleteActionClicked, onEditActionClicked]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'updatedAt',
        direction: 'desc' as const,
      },
    }),
    []
  );

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
          pagination
          sorting={sorting}
        />
      </EuiPanel>
      {editFlyoutVisible && (
        <Flyout
          flyoutVisible={editFlyoutVisible}
          onClose={onEditFlyoutClosed}
          onSaveConfirmed={onEditFlyoutSaved}
          onSaveCancelled={onEditFlyoutClosed}
          title={selectedConversation?.title ?? i18n.CONVERSATIONS_TABLE_COLUMN_TYPE}
        >
          <ConversationSettingsEditor
            allSystemPrompts={allSystemPrompts}
            conversationSettings={conversations}
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
      {deleteConfirmModalVisibility && deleteConversation?.title && (
        <EuiConfirmModal
          aria-labelledby={i18n.DELETE_CONVERSATION_CONFIRMATION_TITLE}
          title={i18n.DELETE_CONVERSATION_CONFIRMATION_TITLE}
          titleProps={{ id: deleteConversation?.id ?? undefined }}
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
