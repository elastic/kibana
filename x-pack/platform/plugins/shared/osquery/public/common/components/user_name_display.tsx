/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useBulkGetUserProfiles } from '../hooks/use_bulk_get_user_profiles';

export interface UserNameDisplayProps {
  userId: string;
  'data-test-subj'?: string;
}

export const UserNameDisplay: React.FC<UserNameDisplayProps> = React.memo(
  ({ userId, 'data-test-subj': dataTestSubj }) => {
    const userIds = useMemo(() => new Set([userId]), [userId]);
    const { isLoading, data: userProfiles } = useBulkGetUserProfiles({ uids: userIds });

    if (isLoading) {
      return <EuiLoadingSpinner size="s" data-test-subj={dataTestSubj} />;
    }

    if (!userProfiles?.length) {
      return <span data-test-subj={dataTestSubj}>{userId}</span>;
    }

    const userProfile = userProfiles[0];
    const displayName = userProfile.user.full_name ?? userProfile.user.username;

    return <span data-test-subj={dataTestSubj}>{displayName}</span>;
  }
);

UserNameDisplay.displayName = 'UserNameDisplay';
