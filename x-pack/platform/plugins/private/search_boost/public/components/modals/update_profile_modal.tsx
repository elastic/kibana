/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import type { BoostProfileType, ProfileTarget } from '../../../common/types';
import { validateName } from '../../../common/validation';
import type { ModalTableColumn } from './modal_table';
import type { AffectedLoadState } from './confirm_modal';
import { ConfirmModal } from './confirm_modal';
import { AffectedTable } from './affected_table';
import { SaveAsNewForm } from './save_as_new_form';
import {
  BACK_LABEL,
  BOOST_RULE_COLUMN,
  SAVE_AS_NEW_LABEL,
  SAVE_AS_NEW_TITLE,
  SAVE_LABEL,
  UPDATE_PROFILE_UNUSED_BODY,
  getUpdateProfileBody,
  getUpdateProfileTableLabel,
  getUpdateProfileTitle,
} from '../../translations';

export interface SaveAsNewProps {
  suggestedName: string;
  nameError?: { name: string; message: string };
  onSave: (profileName: string) => void;
}

export interface UpdateProfileModalProps extends AffectedLoadState {
  profileName: string;
  type: BoostProfileType;
  targets: readonly ProfileTarget[];
  isSaving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveAsNew: SaveAsNewProps;
}

const RULE_COLUMNS: ReadonlyArray<ModalTableColumn<ProfileTarget>> = [
  { id: 'rule', name: BOOST_RULE_COLUMN, render: ({ ruleName }) => ruleName },
];

export const UpdateProfileModal = ({
  profileName,
  type,
  targets,
  isSaving = false,
  onCancel,
  onSave,
  saveAsNew,
  isLoading = false,
  loadError,
  onRetryLoad,
}: UpdateProfileModalProps) => {
  const [isNaming, setIsNaming] = useState(false);
  // Follows the suggested name until the user edits it.
  const [editedName, setEditedName] = useState<string>();
  // The name last saved; format errors only show once the user has tried to save.
  const [savedName, setSavedName] = useState<string>();

  if (isNaming) {
    const { suggestedName, nameError, onSave: onSaveAsNew } = saveAsNew;
    const newName = editedName ?? suggestedName;
    const formatError = validateName(newName);
    const passedError = nameError?.name === newName ? nameError.message : undefined;
    const error = savedName !== undefined && formatError ? formatError.message : passedError;

    const saveNewName = () => {
      setSavedName(newName);
      if (!formatError) {
        onSaveAsNew(newName);
      }
    };

    return (
      <ConfirmModal
        title={SAVE_AS_NEW_TITLE}
        cancelButtonText={BACK_LABEL}
        confirmButtonText={SAVE_LABEL}
        isConfirming={isSaving}
        onCancel={() => setIsNaming(false)}
        onClose={onCancel}
        onConfirm={saveNewName}
        data-test-subj="searchBoostUpdateProfileModal"
      >
        <SaveAsNewForm
          name={newName}
          onNameChange={setEditedName}
          error={error}
          isDisabled={isSaving}
          onSubmit={saveNewName}
        />
      </ConfirmModal>
    );
  }

  return (
    <ConfirmModal
      isLoading={isLoading}
      loadError={loadError}
      onRetryLoad={onRetryLoad}
      title={getUpdateProfileTitle(profileName)}
      confirmButtonText={SAVE_LABEL}
      isConfirming={isSaving}
      onCancel={onCancel}
      onConfirm={onSave}
      secondaryAction={
        <EuiButton
          size="s"
          onClick={() => setIsNaming(true)}
          isDisabled={isSaving || isLoading || Boolean(loadError)}
          data-test-subj="searchBoostUpdateProfileSaveAsNew"
        >
          {SAVE_AS_NEW_LABEL}
        </EuiButton>
      }
      description={
        targets.length > 0
          ? getUpdateProfileBody(type, targets.length)
          : UPDATE_PROFILE_UNUSED_BODY[type]
      }
      data-test-subj="searchBoostUpdateProfileModal"
    >
      {targets.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <AffectedTable
            aria-label={getUpdateProfileTableLabel(type)}
            type={type}
            targets={targets}
            columns={RULE_COLUMNS}
            data-test-subj="searchBoostUpdateProfileModalTable"
          />
        </>
      )}
    </ConfirmModal>
  );
};
