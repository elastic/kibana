/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import { getName } from './display_name';
import type { UserInfoWithAvatar } from './types';

export interface UsernameProps {
  userInfo?: UserInfoWithAvatar;
  boldName?: boolean;
}

const UsernameComponent: React.FC<UsernameProps> = ({ userInfo, boldName = false }) => {
  const name = getName(userInfo?.user);

  return (
    <EuiText size="s" className="eui-textBreakWord" data-test-subj="user-profile-username">
      {boldName ? (
        <strong data-test-subj={'user-profile-username-bolded'}>{name}</strong>
      ) : (
        <>{name}</>
      )}
    </EuiText>
  );
};
UsernameComponent.displayName = 'Username';

export const Username = React.memo(UsernameComponent);
