/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import type { UserAvatarProps } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';
import { CaseUnknownUserAvatar } from './unknown_user';
import type { UserInfoWithAvatar } from './types';

export interface CaseUserAvatarProps {
  size: UserAvatarProps['size'];
  userInfo?: UserInfoWithAvatar;
}

// `EuiAvatar` wraps itself in its own `EuiToolTip` whenever it receives a `name`, to surface that
// accessible label visually on hover. When this avatar is itself used as the anchor for another
// tooltip (e.g. `UserToolTip`), the two independently-registered tooltips race for EUI's
// single-tooltip-at-a-time manager, so hovering flickers between our tooltip and EuiAvatar's own
// name-only one. `EuiAvatar` isn't interactive on its own (its label already comes from
// `aria-label`), so disable pointer events on its internal tooltip anchor: hover then always
// resolves to whatever tooltip anchor wraps this component instead.
const avatarWrapperStyles = css`
  display: contents;

  .euiToolTipAnchor {
    pointer-events: none;
  }
`;

const CaseUserAvatarComponent: React.FC<CaseUserAvatarProps> = ({ size, userInfo }) => {
  const dataTestSubjName = userInfo?.user?.username;

  return (
    <span css={avatarWrapperStyles}>
      {userInfo?.user !== undefined ? (
        <UserAvatar
          user={userInfo?.user}
          avatar={userInfo?.data?.avatar}
          data-test-subj={`case-user-profile-avatar-${dataTestSubjName}`}
          size={size}
        />
      ) : (
        <CaseUnknownUserAvatar size={size} />
      )}
    </span>
  );
};

CaseUserAvatarComponent.displayName = 'CaseUserAvatar';

export const CaseUserAvatar = React.memo(CaseUserAvatarComponent);
