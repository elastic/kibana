/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { UserProfilesSelectable } from '@kbn/user-profile-components';
import { UserProfile } from '@kbn/core-user-profile-common';
import { useSuggestUserProfiles } from './use_suggest_user_profiles';

interface Props {
  onUserSelect: (user: UserProfile) => void;
  selectedUsers: UserProfile[];
}

const UserProfilesSearchComponent: React.FC<Props> = ({ onUserSelect, selectedUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: userProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    searchTerm,
  });
  console.log('userProfiles', userProfiles);
  return (
    <UserProfilesSelectable
      {...{
        onSearchChange: setSearchTerm,
        options: userProfiles,
        selectedOptions: selectedUsers,
        onChange: (nextSelectedOptions) => {
          const nextFilters = nextSelectedOptions.map((option) => option.user.username);
          // call on change
          console.log('nextSelectedOptions', nextSelectedOptions);
          console.log('nextFilters', nextFilters);
        },
      }}
    />
  );
};

export const UserProfilesSearch = React.memo(UserProfilesSearchComponent);
