/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { UserProfilesSelectable, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserProfile } from '@kbn/core-user-profile-common';
import { useUserProfiles } from './use_user_profiles';

interface Props {
  onUsersSelect: (users: UserProfile[]) => void;
  allUsers: string[];
  selectedUsers: UserProfile[];
}

const UserProfilesListComponent: React.FC<Props> = ({ allUsers, onUsersSelect, selectedUsers }) => {
  const { data: userProfiles } = useUserProfiles(allUsers);

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
        onChange,
        searchable: false,
        options: userProfiles,
        selectedOptions: selectedUsers,
      }}
    />
  );
};

export const UserProfilesList = React.memo(UserProfilesListComponent);
