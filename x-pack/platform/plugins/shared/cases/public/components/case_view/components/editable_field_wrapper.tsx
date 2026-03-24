/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState } from 'react';
import {
  EuiTitle,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
} from '@elastic/eui';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from '../translations';

export interface EditableFieldWrapperProps {
  title: string;
  isLoading: boolean;
  displayContent: ReactNode;
  children: ReactNode;
  onSubmit: () => void | Promise<void>;
  onEnterEdit?: () => void;
  'data-test-subj'?: string;
}

export const EditableFieldWrapper: React.FC<EditableFieldWrapperProps> = ({
  title,
  isLoading,
  displayContent,
  children,
  onSubmit,
  onEnterEdit,
  'data-test-subj': dataTestSubj = 'editable-field',
}) => {
  const { permissions } = useCasesContext();
  const [isEditing, setIsEditing] = useState(false);

  const onClickEdit = useCallback(() => {
    if (onEnterEdit) {
      onEnterEdit();
    }
    setIsEditing(true);
  }, [onEnterEdit]);

  const onClickSave = useCallback(async () => {
    await onSubmit();
    setIsEditing(false);
  }, [onSubmit]);

  const onClickCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        justifyContent="spaceBetween"
        responsive={false}
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {!isLoading && permissions.update && (
          <EuiFlexItem data-test-subj={`${dataTestSubj}-edit`} grow={false}>
            <EuiButtonIcon
              data-test-subj={`${dataTestSubj}-edit-button`}
              aria-label={i18n.EDIT_FIELD_ARIA_LABEL(title)}
              iconType="pencil"
              onClick={onClickEdit}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      {!isEditing && displayContent}
      {isEditing && (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>{children}</EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  data-test-subj={`${dataTestSubj}-submit`}
                  fill
                  iconType="save"
                  onClick={onClickSave}
                  size="s"
                >
                  {i18n.SAVE}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj={`${dataTestSubj}-cancel`}
                  iconType="cross"
                  onClick={onClickCancel}
                  size="s"
                >
                  {i18n.CANCEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexItem>
  );
};

EditableFieldWrapper.displayName = 'EditableFieldWrapper';
