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
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { Conversation, ConversationsBulkActions } from '../../../../..';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { Flyout } from '../../../common/components/assistant_settings_management/flyout';
import { useFlyoutModalVisibility } from '../../../common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE } from '../../../settings/const';
import { CANCEL, DELETE } from '../../../settings/translations';
import { Prompt } from '../../../types';
import { SystemPromptEditor } from '../system_prompt_modal/system_prompt_editor';
import { SETTINGS_TITLE } from '../system_prompt_modal/translations';
import { useSystemPromptEditor } from '../system_prompt_modal/use_system_prompt_editor';
import * as i18n from './translations';
import { useSystemPromptTable } from './use_system_prompt_table';

interface Props {
  connectors: AIConnector[] | undefined;
  conversations: Record<string, Conversation>;
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  onSelectedSystemPromptChange: (systemPrompt?: Prompt) => void;
  selectedSystemPrompt: Prompt | undefined;
  setUpdatedSystemPromptSettings: React.Dispatch<React.SetStateAction<Prompt[]>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  systemPromptSettings: Prompt[];
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
  defaultConnector?: AIConnector;
  handleSave: (shouldRefetchConversation?: boolean) => void;
  onCancelClick: () => void;
  resetSettings: () => void;
}

const SystemPromptSettingsManagementComponent = ({
  connectors,
  conversations,
  conversationSettings,
  onSelectedSystemPromptChange,
  setUpdatedSystemPromptSettings,
  setConversationSettings,
  selectedSystemPrompt,
  systemPromptSettings,
  conversationsSettingsBulkActions,
  setConversationsSettingsBulkActions,
  defaultConnector,
  handleSave,
  onCancelClick,
  resetSettings,
}: Props) => {
  const { isFlyoutOpen: editFlyoutVisible, openFlyout, closeFlyout } = useFlyoutModalVisibility();
  const {
    isFlyoutOpen: deleteConfirmModalVisibility,
    openFlyout: openConfirmModal,
    closeFlyout: closeConfirmModal,
  } = useFlyoutModalVisibility();
  const [deletedPrompt, setDeletedPrompt] = useState<Prompt | null>();

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
  });

  const onEditActionClicked = useCallback(
    (prompt: Prompt) => {
      onSystemPromptSelectionChange(prompt);
      openFlyout();
    },
    [onSystemPromptSelectionChange, openFlyout]
  );

  const onDeleteActionClicked = useCallback(
    (prompt: Prompt) => {
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
    handleSave(true);
    setConversationsSettingsBulkActions({});
  }, [closeConfirmModal, handleSave, setConversationsSettingsBulkActions]);

  const onSaveCancelled = useCallback(() => {
    closeFlyout();
    onCancelClick();
  }, [closeFlyout, onCancelClick]);

  const onSaveConfirmed = useCallback(() => {
    closeFlyout();
    handleSave(true);
    setConversationsSettingsBulkActions({});
  }, [closeFlyout, handleSave, setConversationsSettingsBulkActions]);

  const confirmationTitle = useMemo(
    () =>
      deletedPrompt?.name
        ? i18n.DELETE_SYSTEM_PROMPT_MODAL_TITLE(deletedPrompt?.name)
        : i18n.DELETE_SYSTEM_PROMPT_MODAL_DEFAULT_TITLE,
    [deletedPrompt?.name]
  );

  const { getColumns, getSystemPromptsList } = useSystemPromptTable();

  const columns = useMemo(
    () => getColumns({ onEditActionClicked, onDeleteActionClicked }),
    [getColumns, onEditActionClicked, onDeleteActionClicked]
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

  const pagination = useMemo(
    () => ({
      pageIndex: DEFAULT_PAGE_INDEX,
      pageSize: DEFAULT_PAGE_SIZE,
      pageSizeOptions: [DEFAULT_PAGE_SIZE],
      totalItemCount: systemPromptSettings.length,
    }),
    [systemPromptSettings.length]
  );
  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton iconType="plusInCircle" onClick={onCreate}>
              {SETTINGS_TITLE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <EuiInMemoryTable pagination={pagination} items={systemPromptListItems} columns={columns} />
      </EuiPanel>
      <Flyout
        flyoutVisible={editFlyoutVisible}
        title={SETTINGS_TITLE}
        onClose={onSaveCancelled}
        onSaveCancelled={onSaveCancelled}
        onSaveConfirmed={onSaveConfirmed}
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
