/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { PromptResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { useQuickPromptUpdater } from '../../settings/use_settings_updater/use_quick_prompt_updater';
import { QuickPromptSettingsEditor } from '../quick_prompt_settings/quick_prompt_editor';
import * as i18n from './translations';
import { useFlyoutModalVisibility } from '../../common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import { Flyout } from '../../common/components/assistant_settings_management/flyout';
import { CANCEL, DELETE, SETTINGS_UPDATED_TOAST_TITLE } from '../../settings/translations';
import { useQuickPromptTable } from './use_quick_prompt_table';
import {
  getDefaultTableOptions,
  useSessionPagination,
} from '../../common/components/assistant_settings_management/pagination/use_session_pagination';
import { QUICK_PROMPT_TABLE_SESSION_STORAGE_KEY } from '../../../assistant_context/constants';
import { useAssistantContext } from '../../../assistant_context';
import { useFetchPrompts } from '../../api';

const QuickPromptSettingsManagementComponent = () => {
  const { currentAppId, http, nameSpace, basePromptContexts, toasts } = useAssistantContext();

  const { data: allPrompts, isFetched: promptsLoaded, refetch: refetchPrompts } = useFetchPrompts();

  const {
    onPromptContentChange,
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

  const handleSave = useCallback(
    async (param?: { callback?: () => void }) => {
      const didSucceed = await saveQuickPromptSettings();
      if (didSucceed) {
        toasts?.addSuccess({
          iconType: 'check',
          title: SETTINGS_UPDATED_TOAST_TITLE,
        });
        param?.callback?.();
      }
    },
    [saveQuickPromptSettings, toasts]
  );

  const onCancelClick = useCallback(() => {
    resetQuickPromptSettings();
  }, [resetQuickPromptSettings]);

  const { isFlyoutOpen: editFlyoutVisible, openFlyout, closeFlyout } = useFlyoutModalVisibility();
  const [deletedQuickPrompt, setDeletedQuickPrompt] = useState<PromptResponse | null>();
  const {
    isFlyoutOpen: deleteConfirmModalVisibility,
    openFlyout: openConfirmModal,
    closeFlyout: closeConfirmModal,
  } = useFlyoutModalVisibility();

  const onEditActionClicked = useCallback(
    (prompt: PromptResponse) => {
      onQuickPromptSelect(prompt);
      openFlyout();
    },
    [onQuickPromptSelect, openFlyout]
  );

  const onDeleteActionClicked = useCallback(
    (prompt: PromptResponse) => {
      setDeletedQuickPrompt(prompt);
      onQuickPromptDelete(prompt.id);
      openConfirmModal();
    },
    [onQuickPromptDelete, openConfirmModal]
  );

  const onDeleteCancelled = useCallback(() => {
    setDeletedQuickPrompt(null);
    closeConfirmModal();
    onCancelClick();
  }, [closeConfirmModal, onCancelClick]);

  const onDeleteConfirmed = useCallback(() => {
    handleSave({ callback: refetchPrompts });
    closeConfirmModal();
  }, [closeConfirmModal, handleSave, refetchPrompts]);

  const onCreate = useCallback(() => {
    onQuickPromptSelect();
    openFlyout();
  }, [onQuickPromptSelect, openFlyout]);

  const onSaveCancelled = useCallback(() => {
    closeFlyout();
    onCancelClick();
  }, [closeFlyout, onCancelClick]);

  const onSaveConfirmed = useCallback(() => {
    handleSave({ callback: refetchPrompts });
    closeFlyout();
  }, [closeFlyout, handleSave, refetchPrompts]);

  const { getColumns } = useQuickPromptTable();
  const columns = getColumns({
    isActionsDisabled: !promptsLoaded,
    basePromptContexts,
    onEditActionClicked,
    onDeleteActionClicked,
    isDeleteEnabled: (prompt: PromptResponse) => prompt.isDefault !== true,
    isEditEnabled: () => true,
  });

  const { onTableChange, pagination, sorting } = useSessionPagination<PromptResponse, true>({
    defaultTableOptions: getDefaultTableOptions<PromptResponse>({ sortField: 'updatedAt' }),
    nameSpace,
    storageKey: QUICK_PROMPT_TABLE_SESSION_STORAGE_KEY,
  });

  const confirmationTitle = useMemo(
    () =>
      deletedQuickPrompt?.name
        ? i18n.DELETE_QUICK_PROMPT_MODAL_TITLE(deletedQuickPrompt.name)
        : i18n.DELETE_QUICK_PROMPT_MODAL_DEFAULT_TITLE,
    [deletedQuickPrompt?.name]
  );

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText size="m">{i18n.QUICK_PROMPTS_DESCRIPTION}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="plusInCircle" onClick={onCreate} disabled={!promptsLoaded}>
              {i18n.QUICK_PROMPTS_TABLE_CREATE_BUTTON_TITLE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiInMemoryTable
          columns={columns}
          items={quickPromptSettings}
          onTableChange={onTableChange}
          pagination={pagination}
          sorting={sorting}
        />
      </EuiPanel>
      <Flyout
        flyoutVisible={editFlyoutVisible}
        title={i18n.QUICK_PROMPT_EDIT_FLYOUT_TITLE}
        onClose={onSaveCancelled}
        onSaveCancelled={onSaveCancelled}
        onSaveConfirmed={onSaveConfirmed}
        saveButtonDisabled={selectedQuickPrompt?.name == null || selectedQuickPrompt?.name === ''}
      >
        <QuickPromptSettingsEditor
          onPromptContentChange={onPromptContentChange}
          onQuickPromptColorChange={onQuickPromptColorChange}
          onQuickPromptContextChange={onQuickPromptContextChange}
          onQuickPromptDelete={onQuickPromptDelete}
          onQuickPromptSelect={onQuickPromptSelect}
          resetSettings={resetQuickPromptSettings}
          selectedQuickPrompt={selectedQuickPrompt}
          quickPromptSettings={quickPromptSettings}
        />
      </Flyout>
      {deleteConfirmModalVisibility && deletedQuickPrompt && (
        <EuiConfirmModal
          aria-labelledby={confirmationTitle}
          title={confirmationTitle}
          onCancel={onDeleteCancelled}
          onConfirm={onDeleteConfirmed}
          cancelButtonText={CANCEL}
          confirmButtonText={DELETE}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>{i18n.DELETE_QUICK_PROMPT_MODAL_DESCRIPTION}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};

export const QuickPromptSettingsManagement = QuickPromptSettingsManagementComponent;
