/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';

import styled, { css } from 'styled-components';
import { UserActionAvatar } from './user_action_avatar';
import { UserActionTitle } from './user_action_title';

interface UserActionItemProps {
  createdAt: string;
  id: string;
  isEditable: boolean;
  isLoading: boolean;
  labelAction?: string;
  labelTitle?: string;
  fullName: string;
  markdown: React.ReactNode;
  onEdit: (id: string) => void;
  userName: string;
}

const UserActionItemContainer = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    & {
      background-image: linear-gradient(
        to right,
        transparent 0,
        transparent 15px,
        ${theme.eui.euiBorderColor} 15px,
        ${theme.eui.euiBorderColor} 17px,
        transparent 17px,
        transparent 100%
      );
      background-repeat: no-repeat;
      background-position: left ${theme.eui.euiSizeXXL};
      margin-bottom: ${theme.eui.euiSizeS};
    }
    .userAction__panel {
      margin-bottom: ${theme.eui.euiSize};
    }
    .userAction__circle {
      flex-shrink: 0;
      margin-right: ${theme.eui.euiSize};
      vertical-align: top;
    }
    .userAction__title {
      padding: ${theme.eui.euiSizeS} ${theme.eui.euiSizeL};
      background: ${theme.eui.euiColorLightestShade};
      border-bottom: ${theme.eui.euiBorderThin};
      border-radius: ${theme.eui.euiBorderRadius} ${theme.eui.euiBorderRadius} 0 0;
    }
    .euiText--small * {
      margin-bottom: 0;
    }
  `}
`;

export const UserActionItem = ({
  createdAt,
  id,
  isEditable,
  isLoading,
  labelAction,
  labelTitle,
  fullName,
  markdown,
  onEdit,
  userName,
}: UserActionItemProps) => (
  <UserActionItemContainer gutterSize={'none'}>
    <EuiFlexItem data-test-subj={`user-action-${id}-avatar`} grow={false}>
      <UserActionAvatar name={fullName ?? userName} />
    </EuiFlexItem>
    <EuiFlexItem data-test-subj={`user-action-${id}`}>
      {isEditable && markdown}
      {!isEditable && (
        <EuiPanel className="userAction__panel" paddingSize="none">
          <UserActionTitle
            createdAt={createdAt}
            id={id}
            isLoading={isLoading}
            labelAction={labelAction ?? ''}
            labelTitle={labelTitle ?? ''}
            userName={userName}
            onEdit={onEdit}
          />
          {markdown}
        </EuiPanel>
      )}
    </EuiFlexItem>
  </UserActionItemContainer>
);
