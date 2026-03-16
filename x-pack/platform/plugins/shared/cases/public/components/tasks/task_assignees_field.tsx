/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { differenceWith, isEmpty } from 'lodash';
import React, { useCallback, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiHighlight, EuiLink, EuiTextColor } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName, UserAvatar } from '@kbn/user-profile-components';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useIsUserTyping } from '../../common/use_is_user_typing';
import * as i18n from './translations';

type UserProfileOption = EuiComboBoxOptionOption<string> & UserProfileWithAvatar;

const toOption = (profile: UserProfileWithAvatar): UserProfileOption =>
  ({
    label: getUserDisplayName(profile.user),
    value: profile.uid,
    key: profile.uid,
    ...profile,
  } as UserProfileOption);

interface TaskAssigneesFieldProps {
  value: Array<{ uid: string }>;
  onChange: (assignees: Array<{ uid: string }>) => void;
}

export const TaskAssigneesField: React.FC<TaskAssigneesFieldProps> = ({ value, onChange }) => {
  const { owner: owners } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();

  const { data: currentUserProfile, isLoading: isLoadingCurrentUser } = useGetCurrentUserProfile();

  const { data: suggestedProfiles = [], isLoading: isLoadingSuggested, isFetching: isFetchingSuggested } =
    useSuggestUserProfiles({ name: searchTerm, owners, onDebounce });

  // Bulk-get profiles for already-selected assignees that aren't in the suggestion results
  const missingUids = differenceWith(
    value,
    suggestedProfiles,
    (assignee, profile) => assignee.uid === profile.uid
  ).map((a) => a.uid);

  const { data: bulkProfiles = new Map(), isLoading: isLoadingBulk } =
    useBulkGetUserProfiles({ uids: missingUids });

  const bulkProfilesArray = Array.from(bulkProfiles.values());

  const allProfiles = [...suggestedProfiles, ...bulkProfilesArray];
  const options: UserProfileOption[] = allProfiles.map(toOption);

  const selectedOptions: UserProfileOption[] = value
    .map(({ uid }) => options.find((o) => o.key === uid))
    .filter((o): o is UserProfileOption => o != null);

  const isLoading =
    isLoadingCurrentUser ||
    isLoadingSuggested ||
    isFetchingSuggested ||
    isLoadingBulk ||
    isUserTyping;

  const handleChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      onChange(selected.map((o) => ({ uid: o.value ?? '' })));
    },
    [onChange]
  );

  const handleSearchChange = useCallback(
    (term: string) => {
      if (!isEmpty(term)) {
        setSearchTerm(term);
      }
      onContentChange(term);
    },
    [onContentChange]
  );

  const handleSelfAssign = useCallback(() => {
    if (!currentUserProfile) return;
    const alreadySelected = value.some((a) => a.uid === currentUserProfile.uid);
    if (!alreadySelected) onChange([...value, { uid: currentUserProfile.uid }]);
  }, [currentUserProfile, value, onChange]);

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>, searchValue: string, contentClassName: string) => {
      const { user, data } = option as UserProfileOption;
      const displayName = getUserDisplayName(user);
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <UserAvatar user={user} avatar={data?.avatar} size="s" />
          </EuiFlexItem>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none" responsive={false}>
            <EuiFlexItem>
              <EuiHighlight search={searchValue} className={contentClassName}>
                {displayName}
              </EuiHighlight>
            </EuiFlexItem>
            {user.email && user.email !== displayName ? (
              <EuiFlexItem grow={false}>
                <EuiTextColor color="subdued">
                  <EuiHighlight search={searchValue} className={contentClassName}>
                    {user.email}
                  </EuiHighlight>
                </EuiTextColor>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexGroup>
      );
    },
    []
  );

  const isSelfSelected = Boolean(currentUserProfile && value.some((a) => a.uid === currentUserProfile.uid));

  return (
    <EuiFormRow
      label={i18n.TASK_ASSIGNEES}
      fullWidth
      helpText={
        currentUserProfile ? (
          <EuiLink onClick={handleSelfAssign} disabled={isSelfSelected} data-test-subj="cases-task-assign-yourself">
            {i18n.ASSIGN_YOURSELF}
          </EuiLink>
        ) : undefined
      }
    >
      <EuiComboBox
        fullWidth
        async
        isLoading={isLoading}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onSearchChange={handleSearchChange}
        renderOption={renderOption}
        rowHeight={35}
        data-test-subj="cases-task-assignees-combobox"
      />
    </EuiFormRow>
  );
};
