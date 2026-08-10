/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { Assignee } from '../../../../../user_profiles/types';
import { UserAvatarWithEmail } from './user_avatar_with_email';

export interface UserPickerFieldPanelLayoutProps {
  title: string;
  dataTestSubj: string;
  labelTestSubj: string;
  isLoading: boolean;
  hasUsers: boolean;
  children: ReactNode;
}

export const UserPickerFieldPanelLayout: React.FC<UserPickerFieldPanelLayoutProps> = ({
  title,
  dataTestSubj,
  labelTestSubj,
  isLoading,
  hasUsers,
  children,
}) => {
  const { euiTheme } = useEuiTheme();

  const labelStyles = useMemo(
    () => css`
      font-weight: ${euiTheme.font.weight.semiBold};
    `,
    [euiTheme]
  );

  return (
    <EuiPanel data-test-subj={dataTestSubj} hasShadow={false} hasBorder={true} paddingSize="m">
      <EuiText size="xs" color="subdued" data-test-subj={labelTestSubj}>
        <span css={labelStyles}>{title}</span>
      </EuiText>
      <EuiSpacer size="m" />
      {isLoading && !hasUsers ? (
        <EuiLoadingSpinner data-test-subj={`${dataTestSubj}-loading`} />
      ) : (
        children
      )}
    </EuiPanel>
  );
};

UserPickerFieldPanelLayout.displayName = 'UserPickerFieldPanelLayout';

export const UserAvatarList: React.FC<{
  users: Assignee[];
  caseId: string;
  caseTitle: string;
}> = ({ users, caseId, caseTitle }) => (
  <>
    {users.map((user) => (
      <EuiFlexItem grow={false} key={user.uid}>
        <UserAvatarWithEmail userInfo={user.profile} caseId={caseId} caseTitle={caseTitle} />
      </EuiFlexItem>
    ))}
  </>
);

UserAvatarList.displayName = 'UserAvatarList';
