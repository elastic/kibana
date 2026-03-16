/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { differenceWith, isEmpty } from 'lodash';
import React, { useCallback, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHighlight,
  EuiLink,
  EuiTextColor,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName, UserAvatar } from '@kbn/user-profile-components';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useIsUserTyping } from '../../common/use_is_user_typing';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { getAllPermissionsExceptFrom } from '../../utils/permissions';
import { bringCurrentUserToFrontAndSort } from '../user_profiles/sort';
import * as i18n from './translations';

type UserProfileComboBoxOption = EuiComboBoxOptionOption<string> & UserProfileWithAvatar;

const userProfileToComboBoxOption = (userProfile: UserProfileWithAvatar): UserProfileComboBoxOption =>
  ({
    label: getUserDisplayName(userProfile.user),
    value: userProfile.uid,
    key: userProfile.uid,
    user: userProfile.user,
    data: userProfile.data,
  } as UserProfileComboBoxOption);

const comboBoxOptionToAssignee = (option: EuiComboBoxOptionOption<string>) => ({
  uid: option.value ?? '',
});

interface TaskAssigneesFieldProps {
  value: Array<{ uid: string }>;
  onChange: (assignees: Array<{ uid: string }>) => void;
}

export const TaskAssigneesField: React.FC<TaskAssigneesFieldProps> = ({ value, onChange }) => {
  const { owner: owners } = useCasesContext();
  const availableOwners = useAvailableCasesOwners(getAllPermissionsExceptFrom('delete'));
  const [searchTerm, setSearchTerm] = useState('');
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();
  const hasOwners = owners.length > 0;

  const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();

  const {
    data: userProfiles = [],
    isLoading: isLoadingSuggest,
    isFetching: isFetchingSuggest,
  } = useSuggestUserProfiles({
    name: searchTerm,
    owners: hasOwners ? owners : availableOwners,
    onDebounce,
  });

  const assigneesWithoutProfiles = differenceWith(
    value,
    userProfiles,
    (assignee, userProfile) => assignee.uid === userProfile.uid
  );

  const { data: bulkUserProfiles = new Map(), isFetching: isLoadingBulkGetUserProfiles } =
    useBulkGetUserProfiles({ uids: assigneesWithoutProfiles.map((assignee) => assignee.uid) });

  const bulkUserProfilesAsArray = Array.from(bulkUserProfiles).map(([_, profile]) => profile);

  const options =
    bringCurrentUserToFrontAndSort(currentUserProfile, [
      ...userProfiles,
      ...bulkUserProfilesAsArray,
    ])?.map((userProfile) => userProfileToComboBoxOption(userProfile)) ?? [];

  const selectedOptions: UserProfileComboBoxOption[] = value
    .map(({ uid }) => options.find((o) => o.key === uid))
    .filter((o): o is UserProfileComboBoxOption => o != null);

  const onSearchComboChange = useCallback(
    (term: string) => {
      if (!isEmpty(term)) {
        setSearchTerm(term);
      }
      onContentChange(term);
    },
    [onContentChange]
  );

  const onComboChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      onChange(selected.map((option) => comboBoxOptionToAssignee(option)));
    },
    [onChange]
  );

  const onSelfAssign = useCallback(() => {
    if (!currentUserProfile) return;
    const alreadySelected = value.some((a) => a.uid === currentUserProfile.uid);
    if (!alreadySelected) onChange([...value, { uid: currentUserProfile.uid }]);
  }, [currentUserProfile, value, onChange]);

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>, searchValue: string, contentClassName: string) => {
      const { user, data } = option as UserProfileComboBoxOption;
      const displayName = getUserDisplayName(user);
      return (
        <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <UserAvatar user={user} avatar={data.avatar} size="s" />
          </EuiFlexItem>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="none"
            responsive={false}
          >
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

  const isLoading =
    isLoadingCurrentUserProfile ||
    isLoadingBulkGetUserProfiles ||
    isLoadingSuggest ||
    isFetchingSuggest ||
    isUserTyping;

  const isDisabled = isLoadingCurrentUserProfile || isLoadingBulkGetUserProfiles;

  const isCurrentUserSelected = Boolean(
    value.find((assignee) => assignee.uid === currentUserProfile?.uid)
  );

  return (
    <EuiFormRow
      fullWidth
      label={i18n.TASK_ASSIGNEES}
      helpText={
        currentUserProfile ? (
          <EuiLink
            data-test-subj="cases-task-assign-yourself"
            onClick={onSelfAssign}
            disabled={isCurrentUserSelected}
          >
            {i18n.ASSIGN_YOURSELF}
          </EuiLink>
        ) : undefined
      }
    >
      <EuiComboBox
        fullWidth
        async
        isLoading={isLoading}
        isDisabled={isDisabled}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onComboChange}
        onSearchChange={onSearchComboChange}
        renderOption={renderOption}
        rowHeight={35}
        data-test-subj="cases-task-assignees-combobox"
      />
    </EuiFormRow>
  );
};
