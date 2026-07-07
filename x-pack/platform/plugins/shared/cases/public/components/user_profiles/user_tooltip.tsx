/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import type { UserProfileUserInfo } from '@kbn/user-profile-components';
import { CaseUserAvatar } from './user_avatar';
import { getName } from './display_name';
import * as i18n from './translations';
import type { UserInfoWithAvatar } from './types';

const UserFullInformation: React.FC<{ userInfo?: UserInfoWithAvatar }> = React.memo(
  ({ userInfo }) => {
    if (userInfo?.user?.full_name) {
      return (
        <EuiText size="s" className="eui-textBreakWord">
          <strong data-test-subj="user-profile-tooltip-full-name">{userInfo.user.full_name}</strong>
        </EuiText>
      );
    }

    return (
      <EuiText
        size="s"
        className="eui-textBreakWord"
        data-test-subj="user-profile-tooltip-single-name"
      >
        <strong>{getNameOrMissingText(userInfo?.user)}</strong>
      </EuiText>
    );
  }
);

const getNameOrMissingText = (user?: UserProfileUserInfo) => {
  if (!user) {
    return i18n.MISSING_PROFILE;
  }

  return getName(user);
};

UserFullInformation.displayName = 'UserFullInformation';

const UserToolTipAvatar: React.FC<
  Pick<React.ComponentProps<typeof CaseUserAvatar>, 'userInfo'>
> = ({ userInfo }) => <CaseUserAvatar size={'m'} userInfo={userInfo} />;
UserToolTipAvatar.displayName = 'UserToolTipAvatar';

interface UserFullRepresentationProps {
  userInfo?: UserInfoWithAvatar;
}

const UserFullRepresentationComponent: React.FC<UserFullRepresentationProps> = ({ userInfo }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false} data-test-subj="user-profile-tooltip-avatar">
        <UserToolTipAvatar userInfo={userInfo} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction={'column'} gutterSize="none">
          <EuiFlexItem>
            <UserFullInformation userInfo={userInfo} />
          </EuiFlexItem>
          {userInfo?.user && displayEmail(userInfo) && (
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                className="eui-textBreakWord"
                data-test-subj="user-profile-tooltip-email"
              >
                {userInfo.user.email}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

UserFullRepresentationComponent.displayName = 'UserFullRepresentation';

const displayEmail = (userInfo?: UserInfoWithAvatar) => {
  return userInfo?.user?.full_name && userInfo?.user?.email;
};

export interface UserToolTipProps {
  children: React.ReactElement;
  userInfo?: UserInfoWithAvatar;
}

const UserToolTipComponent: React.FC<UserToolTipProps> = ({ children, userInfo }) => {
  return (
    <EuiToolTip
      display="inlineBlock"
      position="top"
      content={<UserFullRepresentationComponent userInfo={userInfo} />}
      data-test-subj="user-profile-tooltip"
    >
      {children}
    </EuiToolTip>
  );
};

UserToolTipComponent.displayName = 'UserToolTip';
export const UserToolTip = React.memo(UserToolTipComponent);
