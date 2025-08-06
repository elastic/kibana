/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { UserProfilesSelectable, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserProfile } from '@kbn/core-user-profile-common';
import { useSuggestUserProfiles } from './use_suggest_user_profiles';

interface Props {
  onUsersSelect: (users: UserProfile[]) => void;
  selectedUsers: UserProfile[];
}

const UserProfilesSearchComponent: React.FC<Props> = ({ onUsersSelect, selectedUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: userProfiles, isLoading } = useSuggestUserProfiles({
    searchTerm,
    includeCurrentUser: false,
  });

  const onChange = useCallback(
    () => (nextSelectedOptions: UserProfileWithAvatar[]) => {
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
        isLoading,
        onChange,
        onSearchChange: setSearchTerm,
        options: userProfiles,
        selectedOptions: selectedUsers,
      }}
    />
  );
};

export const UserProfilesSearch = React.memo(UserProfilesSearchComponent);
