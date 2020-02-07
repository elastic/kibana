/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { EuiAvatar, EuiPanel, EuiTitle } from '@elastic/eui';
import styled, { css } from 'styled-components';
export interface UserActionItem {
  avatarName: string;
  children: ReactNode;
  title: string;
}

export interface UserActionTreeProps {
  userActions: UserActionItem[];
}

const UserAction = styled.div`
  ${({ theme }) => css`
    &:not(:last-of-type) {
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
    }
    .userAction__titleWrapper {
      display: flex;
    }
    .userAction__circle {
      flex-shrink: 0;
      margin-right: ${theme.eui.euiSize};
      vertical-align: top;
    }
    .userAction__title {
    }
    .userAction__content {
      padding: ${theme.eui.euiSize} ${theme.eui.euiSize} ${theme.eui.euiSizeXL};
      margin: ${theme.eui.euiSizeS} 0;

      // Align the content's contents with the title
      padding-left: 24px;

      // Align content border to horizontal center of step number
      margin-left: 16px;
    }
  `}
`;

const renderUserActions = (userActions: UserActionItem[]) => {
  return userActions.map(({ avatarName, children, title }, key) => (
    <UserAction key={key}>
      <div className="userAction__titleWrapper">
        <EuiAvatar className="userAction__circle" name={avatarName} />
        <EuiPanel>
          <EuiTitle size="s" className="userAction__title">
            <p>{title}</p>
          </EuiTitle>
        </EuiPanel>
      </div>
      <div className="userAction__content">
        <EuiPanel paddingSize="m">{children}</EuiPanel>
      </div>
    </UserAction>
  ));
};

export const UserActionTree = React.memo(({ userActions }: UserActionTreeProps) => (
  <div>{renderUserActions(userActions)}</div>
));

UserActionTree.displayName = 'UserActionTree';
