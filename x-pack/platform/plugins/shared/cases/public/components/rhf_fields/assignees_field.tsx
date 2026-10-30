/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, differenceWith } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiLink,
  EuiTextColor,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { useController } from 'react-hook-form';
import type { CaseAssignees } from '../../../common/types/domain';
import { CaseAssigneesSchema } from '../../../common/types/domain';
import { MAX_ASSIGNEES_PER_CASE } from '../../../common/constants';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { getAllPermissionsExceptFrom } from '../../utils/permissions';
import { useIsUserTyping } from '../../common/use_is_user_typing';
import { bringCurrentUserToFrontAndSort } from '../user_profiles/sort';
import { OptionalFieldLabel } from '../optional_field_label';
import * as i18n from '../create/translations';
import { FieldRow } from './field_row';

type UserProfileComboBoxOption = EuiComboBoxOptionOption<string> &
  Pick<UserProfileWithAvatar, 'user' | 'data'>;

/** Zod schema for the assignees value; use it in the parent form schema so the limit is validated. */
export const assigneesFieldSchema = CaseAssigneesSchema.max(
  MAX_ASSIGNEES_PER_CASE,
  i18n.INVALID_ASSIGNEES
);

interface AssigneesFieldProps {
  /** react-hook-form field path; the value is `CaseAssignees` (`{ uid }[]`). */
  name?: string;
  isLoading?: boolean;
}

const userProfileToComboBoxOption = (
  userProfile: UserProfileWithAvatar
): UserProfileComboBoxOption => ({
  label: getUserDisplayName(userProfile.user),
  value: userProfile.uid,
  key: userProfile.uid,
  user: userProfile.user,
  data: userProfile.data,
});

const renderOption = (
  option: EuiComboBoxOptionOption<string>,
  searchValue: string,
  contentClassName: string
) => {
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
            <EuiTextColor color={'subdued'}>
              <EuiHighlight search={searchValue} className={contentClassName}>
                {user.email}
              </EuiHighlight>
            </EuiTextColor>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

/** Searchable user profile picker for case assignees, with an "assign yourself" shortcut. */
export const AssigneesField = ({
  name = 'assignees',
  isLoading: isLoadingForm = false,
}: AssigneesFieldProps) => {
  const {
    field: { ref, value, onChange, onBlur },
    fieldState,
  } = useController<Record<string, CaseAssignees | undefined>>({ name });
  const selectedAssignees = useMemo(() => value ?? [], [value]);

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

  // Selected users that are not in the current search results still need a profile to be displayed.
  const assigneesWithoutProfiles = differenceWith(
    selectedAssignees,
    userProfiles,
    (assignee, userProfile) => assignee.uid === userProfile.uid
  );

  const { data: bulkUserProfiles = new Map(), isFetching: isLoadingBulkGetUserProfiles } =
    useBulkGetUserProfiles({ uids: assigneesWithoutProfiles.map(({ uid }) => uid) });

  const options =
    bringCurrentUserToFrontAndSort(currentUserProfile, [
      ...userProfiles,
      ...Array.from(bulkUserProfiles.values()),
    ])?.map(userProfileToComboBoxOption) ?? [];

  const selectedOptions = selectedAssignees.reduce<UserProfileComboBoxOption[]>(
    (selected, { uid }) => {
      const option = options.find(({ key }) => key === uid);
      if (option) selected.push(option);
      return selected;
    },
    []
  );

  const onComboChange = useCallback(
    (currentOptions: Array<EuiComboBoxOptionOption<string>>) =>
      onChange(currentOptions.map((option) => ({ uid: option.value ?? '' }))),
    [onChange]
  );

  const onSelfAssign = useCallback(() => {
    if (!currentUserProfile) return;
    onChange([...selectedAssignees, { uid: currentUserProfile.uid }]);
  }, [currentUserProfile, selectedAssignees, onChange]);

  const onSearchComboChange = useCallback(
    (searchValue: string) => {
      if (!isEmpty(searchValue)) {
        setSearchTerm(searchValue);
      }
      onContentChange(searchValue);
    },
    [onContentChange]
  );

  const isDisabled = isLoadingForm || isLoadingCurrentUserProfile || isLoadingBulkGetUserProfiles;
  const isLoading = isDisabled || isLoadingSuggest || isFetchingSuggest || isUserTyping;
  const isCurrentUserSelected = selectedAssignees.some(
    ({ uid }) => uid === currentUserProfile?.uid
  );

  return (
    <FieldRow
      id="createCaseAssignees"
      fieldState={fieldState}
      label={i18n.ASSIGNEES}
      labelAppend={OptionalFieldLabel}
      helpText={
        currentUserProfile ? (
          <EuiLink
            data-test-subj="create-case-assign-yourself-link"
            onClick={onSelfAssign}
            disabled={isCurrentUserSelected}
          >
            {i18n.ASSIGN_YOURSELF}
          </EuiLink>
        ) : undefined
      }
      data-test-subj="caseAssignees"
    >
      <EuiComboBox
        fullWidth
        async
        aria-label={i18n.ASSIGNEES}
        inputRef={ref}
        isInvalid={Boolean(fieldState.error)}
        isLoading={isLoading}
        isDisabled={isDisabled}
        options={options}
        data-test-subj="createCaseAssigneesComboBox"
        selectedOptions={selectedOptions}
        onChange={onComboChange}
        onBlur={onBlur}
        onSearchChange={onSearchComboChange}
        renderOption={renderOption}
        rowHeight={35}
      />
    </FieldRow>
  );
};
AssigneesField.displayName = 'AssigneesField';
