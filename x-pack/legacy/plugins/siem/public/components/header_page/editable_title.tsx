/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
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
  submitTitle: string;
  cancelTitle: string;
  isLoading: boolean;
  onClickEditIcon: () => void;
  title: string | React.ReactNode;
  editMode: boolean;
  editIcon?: string;
  onChange: (a: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const EditableTitleComponent: React.FC<Props> = ({
  onChange,
  onCancel,
  onSubmit,
  isLoading,
  title,
  onClickEditIcon,
  submitTitle,
  cancelTitle,
  editMode = false,
  editIcon = 'pencil',
}) => {
  return editMode ? (
    <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiFieldText onChange={e => onChange(e.target.value)} value={`${title}`} />
      </EuiFlexItem>
      <EuiFlexGroup gutterSize="none" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiButton fill isDisabled={isLoading} isLoading={isLoading} onClick={onSubmit}>
            {submitTitle}
            {i18n.SUBMIT}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel}>{i18n.CANCEL}</EuiButtonEmpty>
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
          aria-label={title as string}
          iconType={editIcon}
          onClick={onClickEditIcon}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EditableTitle = React.memo(EditableTitleComponent);
