/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { UserProfilesSelectable, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { UserProfile } from '@kbn/core-user-profile-common';
import { useUserProfiles } from './use_user_profiles';
import { useSuggestUserProfiles } from './use_suggest_user_profiles';

interface Props {
  forbiddenUsers: string[];
  onUsersSelect: (users: UserProfile[]) => void;
  selectedUsers: UserProfile[];
}

const UserProfilesSearchComponent: React.FC<Props> = ({
  forbiddenUsers,
  onUsersSelect,
  selectedUsers,
}) => {
  const { data: selectedUserProfiles } = useUserProfiles(selectedUsers.map((user) => user.uid));
  const [searchTerm, setSearchTerm] = useState('');
  const { data: userProfiles, isLoading } = useSuggestUserProfiles({
    forbiddenUsers,
    searchTerm,
    // ensure we give length to search beyond the selected users
    size: selectedUsers.length + 5,
  });

  const onChange = useCallback(
    (nextSelectedOptions: UserProfileWithAvatar[]) => {
      const nextUsers: UserProfile[] = nextSelectedOptions.filter(
        (user): user is UserProfile => user !== null
      );
      onUsersSelect(nextUsers);
    },
    [onUsersSelect]
  );

  return (
    <UserProfilesSelectable
      {...{
        'data-test-subj': 'userProfilesSearch',
        isLoading,
        onChange,
        onSearchChange: setSearchTerm,
        options: Array.from(
          new Map(
            // always show selected users
            [...(userProfiles ?? []), ...(selectedUserProfiles ?? [])].map((user) => [
              user.uid,
              user,
            ])
          ).values()
        ),
        selectedOptions: selectedUserProfiles ?? [],
      }}
    />
  );
};

export const UserProfilesSearch = React.memo(UserProfilesSearchComponent);
