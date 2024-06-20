/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiButton,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { QuickPrompt } from '../types';
import { RowActions } from '../../common/components/assistant_settings_management/row_actions';
import { QuickPromptSettingsEditor } from '../quick_prompt_settings/quick_prompt_editor';
import * as i18n from './translations';
import { useFlyoutModalVisibility } from '../../common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import { Flyout } from '../../common/components/assistant_settings_management/flyout';
import { CANCEL, DELETE } from '../../settings/translations';
import { useQuickPromptEditor } from '../quick_prompt_settings/use_quick_prompt_editor';

interface Props {
  onSelectedQuickPromptChange: (quickPrompt?: QuickPrompt) => void;
  quickPromptSettings: QuickPrompt[];
  selectedQuickPrompt: QuickPrompt | undefined;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
  handleSave: () => void;
  onCancelClick: () => void;
}
const QuickPromptSettingsManagementComponent = ({
  onSelectedQuickPromptChange,
  quickPromptSettings,
  selectedQuickPrompt,
  setUpdatedQuickPromptSettings,
  handleSave,
  onCancelClick,
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

  const columns: Array<EuiBasicTableColumn<QuickPrompt>> = useMemo(
    () => [
      {
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_NAME,
        render: (prompt: QuickPrompt) =>
          prompt?.title ? (
            <EuiLink onClick={() => onEditActionClicked(prompt)}>{prompt?.title}</EuiLink>
          ) : null,
      },
      {
        field: 'categories',
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_CONTEXTS,
        render: (categories: QuickPrompt['categories']) =>
          categories?.map((c, idx) => (
            <EuiBadge color="hollow" id={`${idx}`}>
              {c}
            </EuiBadge>
          )),
      },
      /* TODO: enable when createdAt is added
      {
        field: 'createdAt',
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_CREATED_AT,
      },
      */
      {
        name: i18n.QUICK_PROMPTS_TABLE_COLUMN_ACTIONS,
        width: '120px',
        align: 'center',
        render: (prompt: QuickPrompt) => {
          const isDeletable = !prompt.isDefault;
          return (
            <RowActions<QuickPrompt>
              rowItem={prompt}
              onDelete={isDeletable ? onDeleteActionClicked : undefined}
              onEdit={onEditActionClicked}
              isDeletable={isDeletable}
            />
          );
        },
      },
    ],
    [onDeleteActionClicked, onEditActionClicked]
  );

  const confirmationTitle = useMemo(
    () =>
      deletedQuickPrompt?.title
        ? i18n.DELETE_QUICK_PROMPT_MODAL_TITLE(deletedQuickPrompt.title)
        : i18n.DELETE_QUICK_PROMPT_MODAL_DEFAULT_TITLE,
    [deletedQuickPrompt?.title]
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
        <EuiInMemoryTable pagination columns={columns} items={quickPromptSettings} />
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
