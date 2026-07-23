/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash/fp';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import { useCaseViewNavigation } from '../../../../../../common/navigation';
import * as caseViewI18n from '../../../../../case_view/translations';
import * as redesignI18n from '../../../../translations';
import { SmallUserAvatar } from '../../../../../user_profiles/small_user_avatar';
import { UserToolTip } from '../../../../../user_profiles/user_tooltip';
import type { UserInfoWithAvatar } from '../../../../../user_profiles/types';

export interface UserAvatarWithEmailProps {
  userInfo?: UserInfoWithAvatar;
  caseId: string;
  caseTitle: string;
}

export const UserAvatarWithEmail: React.FC<UserAvatarWithEmailProps> = ({
  userInfo,
  caseId,
  caseTitle,
}) => {
  const { euiTheme } = useEuiTheme();
  const { getCaseViewUrl } = useCaseViewNavigation();
  const email = userInfo?.user?.email;

  const mailtoHref = useMemo(() => {
    if (email == null || isEmpty(email)) {
      return undefined;
    }

    const caseUrl = getCaseViewUrl({ detailName: caseId });
    const subject = encodeURIComponent(caseViewI18n.EMAIL_SUBJECT(caseTitle));
    const body = encodeURIComponent(caseViewI18n.EMAIL_BODY(caseUrl));

    return `mailto:${email}?subject=${subject}&body=${body}`;
  }, [caseId, caseTitle, email, getCaseViewUrl]);

  const avatarLinkStyles = useMemo(
    () => css`
      display: inline-flex;
      line-height: 0;
      text-decoration: none;
      border-radius: 50%;

      &:focus {
        outline: none;
      }

      &:focus-visible {
        outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
        outline-offset: 2px;
      }
    `,
    [euiTheme]
  );

  if (mailtoHref == null) {
    return (
      <UserToolTip userInfo={userInfo}>
        <SmallUserAvatar userInfo={userInfo} />
      </UserToolTip>
    );
  }

  const clickToSendEmailLabel = redesignI18n.CLICK_TO_SEND_EMAIL(email ?? '');

  return (
    <EuiToolTip content={clickToSendEmailLabel} disableScreenReaderOutput display="inlineBlock">
      <a
        href={mailtoHref}
        css={avatarLinkStyles}
        data-test-subj="user-picker-field-email-avatar-link"
        aria-label={clickToSendEmailLabel}
      >
        <SmallUserAvatar userInfo={userInfo} />
      </a>
    </EuiToolTip>
  );
};

UserAvatarWithEmail.displayName = 'UserAvatarWithEmail';
