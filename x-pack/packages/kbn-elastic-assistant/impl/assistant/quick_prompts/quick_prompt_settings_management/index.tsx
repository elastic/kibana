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
} from '@elastic/eui';
import { QuickPrompt } from '../types';
import { QuickPromptSettingsEditor } from '../quick_prompt_settings/quick_prompt_editor';
import * as i18n from './translations';
import { useFlyoutModalVisibility } from '../../common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import { Flyout } from '../../common/components/assistant_settings_management/flyout';
import { CANCEL, DELETE } from '../../settings/translations';
import { useQuickPromptEditor } from '../quick_prompt_settings/use_quick_prompt_editor';
import { useQuickPromptTable } from './use_quick_prompt_table';
import { DEFAULT_PAGE_SIZE } from '../../settings/const';
import { PromptContextTemplate } from '../../prompt_context/types';

interface Props {
  basePromptContexts: PromptContextTemplate[];
  handleSave: (shouldRefetchConversation?: boolean) => void;
  onCancelClick: () => void;
  onSelectedQuickPromptChange: (quickPrompt?: QuickPrompt) => void;
  quickPromptSettings: QuickPrompt[];
  resetSettings?: () => void;
  selectedQuickPrompt: QuickPrompt | undefined;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
}

const QuickPromptSettingsManagementComponent = ({
  basePromptContexts,
  handleSave,
  onCancelClick,
  onSelectedQuickPromptChange,
  quickPromptSettings,
  resetSettings,
  selectedQuickPrompt,
  setUpdatedQuickPromptSettings,
}: Props) => {
  const { isFlyoutOpen: editFlyoutVisible, openFlyout, closeFlyout } = useFlyoutModalVisibility();
  const [deletedQuickPrompt, setDeletedQuickPrompt] = useState<QuickPrompt | null>();
  const {
    isFlyoutOpen: deleteConfirmModalVisibility,
    openFlyout: openConfirmModal,
    closeFlyout: closeConfirmModal,
  } = useFlyoutModalVisibility();

  const { onQuickPromptDeleted, onQuickPromptSelectionChange } = useQuickPromptEditor({
    onSelectedQuickPromptChange,
    setUpdatedQuickPromptSettings,
  });

  const onEditActionClicked = useCallback(
    (prompt: QuickPrompt) => {
      onQuickPromptSelectionChange(prompt);
      openFlyout();
    },
    [onQuickPromptSelectionChange, openFlyout]
  );

  const onDeleteActionClicked = useCallback(
    (prompt: QuickPrompt) => {
      setDeletedQuickPrompt(prompt);
      onQuickPromptDeleted(prompt.title);
      openConfirmModal();
    },
    [onQuickPromptDeleted, openConfirmModal]
  );

  const onDeleteCancelled = useCallback(() => {
    setDeletedQuickPrompt(null);
    closeConfirmModal();
    onCancelClick();
  }, [closeConfirmModal, onCancelClick]);

  const onDeleteConfirmed = useCallback(() => {
    handleSave();
    closeConfirmModal();
  }, [closeConfirmModal, handleSave]);

  const onCreate = useCallback(() => {
    onSelectedQuickPromptChange();
    openFlyout();
  }, [onSelectedQuickPromptChange, openFlyout]);

  const onSaveCancelled = useCallback(() => {
    onSelectedQuickPromptChange();
    closeFlyout();
    onCancelClick();
  }, [closeFlyout, onSelectedQuickPromptChange, onCancelClick]);

  const onSaveConfirmed = useCallback(() => {
    handleSave();
    onSelectedQuickPromptChange();
    closeFlyout();
  }, [closeFlyout, handleSave, onSelectedQuickPromptChange]);

  const { getColumns } = useQuickPromptTable();
  const columns = getColumns({
    basePromptContexts,
    onEditActionClicked,
    onDeleteActionClicked,
  });

  const confirmationTitle = useMemo(
    () =>
      deletedQuickPrompt?.title
        ? i18n.DELETE_QUICK_PROMPT_MODAL_TITLE(deletedQuickPrompt.title)
        : i18n.DELETE_QUICK_PROMPT_MODAL_DEFAULT_TITLE,
    [deletedQuickPrompt?.title]
  );

  const pagination = useMemo(
    () => ({
      initialPageSize: DEFAULT_PAGE_SIZE,
      pageSizeOptions: [10, DEFAULT_PAGE_SIZE, 50],
    }),
    []
  );
  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton iconType="plusInCircle" onClick={onCreate}>
              {i18n.QUICK_PROMPTS_TABLE_CREATE_BUTTON_TITLE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiInMemoryTable pagination={pagination} columns={columns} items={quickPromptSettings} />
      </EuiPanel>
      <Flyout
        flyoutVisible={editFlyoutVisible}
        title={i18n.QUICK_PROMPT_EDIT_FLYOUT_TITLE}
        onClose={onSaveCancelled}
        onSaveCancelled={onSaveCancelled}
        onSaveConfirmed={onSaveConfirmed}
      >
        <QuickPromptSettingsEditor
          onSelectedQuickPromptChange={onSelectedQuickPromptChange}
          quickPromptSettings={quickPromptSettings}
          resetSettings={resetSettings}
          selectedQuickPrompt={selectedQuickPrompt}
          setUpdatedQuickPromptSettings={setUpdatedQuickPromptSettings}
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
