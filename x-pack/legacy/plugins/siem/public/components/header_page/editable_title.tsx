/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import styled, { css } from 'styled-components';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButtonIcon,
} from '@elastic/eui';

import * as i18n from './translations';

import { Title } from './title';

const StyledEuiButtonIcon = styled(EuiButtonIcon)`
  ${({ theme }) => css`
    margin-left: ${theme.eui.euiSize};
  `}
`;

StyledEuiButtonIcon.displayName = 'StyledEuiButtonIcon';

interface Props {
  isLoading: boolean;
  title: string | React.ReactNode;
  onSubmit: (title: string) => void;
}

const EditableTitleComponent: React.FC<Props> = ({ onSubmit, isLoading, title }) => {
  const [editMode, setEditMode] = useState(false);
  const [changedTitle, onTitleChange] = useState(title);

  const onCancel = useCallback(() => setEditMode(false), []);
  const onClickEditIcon = useCallback(() => setEditMode(true), []);

  const onClickSubmit = useCallback(
    (newTitle: string): void => {
      onSubmit(newTitle);
      setEditMode(false);
    },
    [changedTitle]
  );

  return editMode ? (
    <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiFieldText
          onChange={e => onTitleChange(e.target.value)}
          value={`${changedTitle}`}
          data-test-subj="editable-title-input-field"
        />
      </EuiFlexItem>
      <EuiFlexGroup gutterSize="none" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isDisabled={isLoading}
            isLoading={isLoading}
            onClick={() => onClickSubmit(changedTitle as string)}
            data-test-subj="editable-title-submit-btn"
          >
            {i18n.SUBMIT}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} data-test-subj="editable-title-cancel-btn">
            {i18n.CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem />
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <Title title={title} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StyledEuiButtonIcon
          aria-label={i18n.EDIT_TITLE_ARIA(title as string)}
          iconType="pencil"
          onClick={onClickEditIcon}
          data-test-subj="editable-title-edit-icon"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EditableTitle = React.memo(EditableTitleComponent);
