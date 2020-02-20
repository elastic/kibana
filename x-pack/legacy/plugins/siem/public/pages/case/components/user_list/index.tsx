/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiText,
  EuiHorizontalRule,
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { ElasticUser } from '../../../../containers/case/types';

interface UserListProps {
  headline: string;
  users: ElasticUser[];
}

const MyAvatar = styled(EuiAvatar)`
  top: -4px;
`;

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeM};
  `}
`;

const renderUsers = (users: ElasticUser[]) => {
  return users.map(({ username }, key) => (
    <MyFlexGroup key={key} justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem>
            <MyAvatar name={username} />
          </EuiFlexItem>
          <EuiFlexItem>
            <p>
              <strong>
                <small>{username}</small>
              </strong>
            </p>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          onClick={() => window.alert('Email clicked')}
          iconType="email"
          aria-label="email"
        />
      </EuiFlexItem>
    </MyFlexGroup>
  ));
};

export const UserList = React.memo(({ headline, users }: UserListProps) => {
  return (
    <EuiText>
      <h4>{headline}</h4>
      <EuiHorizontalRule margin="xs" />
      {renderUsers(users)}
    </EuiText>
  );
});

UserList.displayName = 'UserList';
