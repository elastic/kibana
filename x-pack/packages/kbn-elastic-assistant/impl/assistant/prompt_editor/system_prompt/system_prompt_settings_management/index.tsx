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
  EuiLink,
  EuiBadge,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { Conversation, ConversationsBulkActions } from '../../../../..';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { Flyout } from '../../../common/components/assisttant_settings_management/flyout';
import { useFlyoutModalVisibility } from '../../../common/components/assisttant_settings_management/flyout/use_flyout_modal_visibility';
import { RowActions } from '../../../common/components/assisttant_settings_management/row_actions';
import { getSystemPromptsList } from '../../../quick_prompts/quick_prompt_settings_management.tsx/helpers';
import { CANCEL, DELETE } from '../../../settings/translations';
import { Prompt } from '../../../types';
import { SystemPromptEditor } from '../system_prompt_modal/system_prompt_editor';
import { SETTINGS_TITLE } from '../system_prompt_modal/translations';
import * as i18n from './translations';

interface Props {
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
  handleSave: () => void;
  resetSettings: () => void;
}

const SystemPromptSettingsManagementComponent = ({
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

  const onEditActionClicked = useCallback(
    (prompt: Prompt) => {
      onSelectedSystemPromptChange(prompt);
      openFlyout();
    },
    [onSelectedSystemPromptChange, openFlyout]
  );

  const onDeleteActionClicked = useCallback(
    (prompt: Prompt) => {
      setDeletedPrompt(prompt);
      openConfirmModal();
    },
    [openConfirmModal]
  );

  const onDeleteCancelled = useCallback(() => {
    setDeletedPrompt(null);
    closeConfirmModal();
  }, [closeConfirmModal]);

  const onDeleteConfirmed = useCallback(() => {
    setUpdatedSystemPromptSettings((prev) => prev.filter((sp) => sp.id !== deletedPrompt?.id));
    handleSave();
    closeConfirmModal();
  }, [closeConfirmModal, deletedPrompt?.id, handleSave, setUpdatedSystemPromptSettings]);

  const onSaveCancelled = useCallback(() => {
    onSelectedSystemPromptChange();
    closeFlyout();
    resetSettings();
  }, [onSelectedSystemPromptChange, closeFlyout, resetSettings]);

  const onSaveConfirmed = useCallback(() => {
    handleSave();
    onSelectedSystemPromptChange();
    closeFlyout();
  }, [closeFlyout, handleSave, onSelectedSystemPromptChange]);

  const columns = useMemo(
    () => [
      {
        name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_NAME,
        render: (prompt: Prompt) =>
          prompt?.name ? (
            <EuiLink onClick={() => onEditActionClicked(prompt)}>{prompt?.name}</EuiLink>
          ) : null,
      },
      {
        field: 'defaultConversations',
        name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_DEFAULT_CONVERSATIONS,
        render: (defaultConversations: string[]) =>
          defaultConversations.map((c, idx) => (
            <EuiBadge id={`${idx}`} color="hollow">
              {c}
            </EuiBadge>
          )),
      },
      /* TODO: enable when createdAt is added
      {
        field: 'createdAt',
        name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_CREATED_ON,
      },
      */
      {
        name: 'Actions',
        align: 'center',
        width: '120px',
        render: (prompt: Prompt) => {
          return (
            <RowActions<Prompt>
              rowItem={prompt}
              onEdit={onEditActionClicked}
              onDelete={onDeleteActionClicked}
            />
          );
        },
      },
    ],
    [onEditActionClicked, onDeleteActionClicked]
  );

  const confirmationTitle = useMemo(
    () =>
      deletedPrompt?.name
        ? i18n.DELETE_SYSTEM_PROMPT_MODAL_TITLE(deletedPrompt?.name)
        : i18n.DELETE_SYSTEM_PROMPT_MODAL_DEFAULT_TITLE,
    [deletedPrompt?.name]
  );

  const systemPromptListItems = useMemo(
    () => getSystemPromptsList(systemPromptSettings, conversations),
    [systemPromptSettings, conversations]
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
        <EuiInMemoryTable items={systemPromptListItems} columns={columns} />
      </EuiPanel>
      <Flyout
        flyoutVisible={editFlyoutVisible}
        title={SETTINGS_TITLE}
        onClose={onSaveCancelled}
        onSaveCancelled={onSaveCancelled}
        onSaveConfirmed={onSaveConfirmed}
      >
        <SystemPromptEditor
          conversationSettings={conversationSettings}
          onSelectedSystemPromptChange={onSelectedSystemPromptChange}
          selectedSystemPrompt={selectedSystemPrompt}
          setUpdatedSystemPromptSettings={setUpdatedSystemPromptSettings}
          setConversationSettings={setConversationSettings}
          systemPromptSettings={systemPromptSettings}
          conversationsSettingsBulkActions={conversationsSettingsBulkActions}
          setConversationsSettingsBulkActions={setConversationsSettingsBulkActions}
          defaultConnector={defaultConnector}
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
