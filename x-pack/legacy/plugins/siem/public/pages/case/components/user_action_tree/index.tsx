/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiAvatar, EuiPanel, EuiText } from '@elastic/eui';
import styled, { css } from 'styled-components';

export interface UserActionItem {
  avatarName: string;
  children?: ReactNode;
  skipPanel?: boolean;
  title?: ReactNode;
}

export interface UserActionTreeProps {
  userActions: UserActionItem[];
}

const UserAction = styled(EuiFlexGroup)`
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
    &.repeatAvatar {
      margin-top: -${theme.eui.euiSizeS};
      background-position: left 0;
      .userAction__circle {
        visibility: hidden;
      }
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

const renderUserActions = (userActions: UserActionItem[]) => {
  return userActions.map(({ avatarName, children, skipPanel = false, title }, key) => (
    <UserAction
      data-test-subj={`user-action-${key}`}
      key={key}
      gutterSize={'none'}
      className={key > 0 && avatarName === userActions[key - 1].avatarName ? 'repeatAvatar' : ''}
    >
      <EuiFlexItem grow={false}>
        <EuiAvatar
          data-test-subj={`user-action-avatar`}
          className="userAction__circle"
          name={avatarName}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {skipPanel && !title ? (
          <>{children && <div data-test-subj={`user-action-content`}>{children}</div>}</>
        ) : (
          <EuiPanel className="userAction__panel" paddingSize="none">
            {title && (
              <EuiText size="s" className="userAction__title" data-test-subj={`user-action-title`}>
                {title}
              </EuiText>
            )}
            {children && <div data-test-subj={`user-action-content`}>{children}</div>}
          </EuiPanel>
        )}
      </EuiFlexItem>
    </UserAction>
  ));
};

export const UserActionTree = React.memo(({ userActions }: UserActionTreeProps) => (
  <div>{renderUserActions(userActions)}</div>
));

UserActionTree.displayName = 'UserActionTree';
