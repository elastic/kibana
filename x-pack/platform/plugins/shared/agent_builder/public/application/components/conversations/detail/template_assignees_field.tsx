/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { differenceWith } from 'lodash';
import { useBulkGetUserProfiles } from '../../../hooks/use_bulk_get_user_profiles';
import { useCurrentUserProfile } from '../../../hooks/use_current_user_profile';
import { useSuggestUsers } from '../../../hooks/use_suggest_users';
import {
  MAX_TEMPLATE_ASSIGNEES,
  assigneeOptionToStoredValue,
  parseTemplateAssignees,
  profileToAssigneeOption,
  sortProfilesWithCurrentUserFirst,
  type TemplateAssignee,
  type TemplateAssigneeOption,
} from './template_assignees_utils';

const SEARCH_DEBOUNCE_MS = 200;

const labels = {
  assignYourself: i18n.translate(
    'xpack.agentBuilder.conversationDetail.templateField.assignYourself',
    {
      defaultMessage: 'Assign yourself',
    }
  ),
  maxAssigneesError: i18n.translate(
    'xpack.agentBuilder.conversationDetail.templateField.maxAssigneesError',
    {
      defaultMessage: 'You cannot assign more than {maxAssignees} users.',
      values: { maxAssignees: MAX_TEMPLATE_ASSIGNEES },
    }
  ),
};

interface TemplateAssigneesFieldProps {
  label: string;
  value: unknown;
  isSaving: boolean;
  onChange: (value: TemplateAssignee[]) => void;
}

export const TemplateAssigneesField: React.FC<TemplateAssigneesFieldProps> = ({
  label,
  value,
  isSaving,
  onChange,
}) => {
  const selectedAssignees = useMemo(() => parseTemplateAssignees(value), [value]);
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);

  const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile } =
    useCurrentUserProfile();
  const { data: suggestedProfiles = [], isFetching: isFetchingSuggest } =
    useSuggestUsers(debouncedSearch);

  const assigneesWithoutProfiles = useMemo(
    () =>
      differenceWith(
        selectedAssignees,
        suggestedProfiles,
        (assignee, profile) => assignee.uid === profile.uid
      ),
    [selectedAssignees, suggestedProfiles]
  );

  const { data: bulkUserProfiles = new Map(), isFetching: isLoadingBulkGetUserProfiles } =
    useBulkGetUserProfiles({
      uids: assigneesWithoutProfiles.map((assignee) => assignee.uid),
    });

  const allKnownProfiles = useMemo(
    () => [
      ...suggestedProfiles,
      ...Array.from(bulkUserProfiles.values()),
    ],
    [bulkUserProfiles, suggestedProfiles]
  );

  const options = useMemo(
    () =>
      sortProfilesWithCurrentUserFirst(currentUserProfile?.uid, allKnownProfiles).map(
        profileToAssigneeOption
      ),
    [allKnownProfiles, currentUserProfile?.uid]
  );

  const selectedOptions = useMemo(
    () =>
      selectedAssignees
        .map(({ uid }) => {
          const profile = allKnownProfiles.find((entry) => entry.uid === uid);
          return profile ? profileToAssigneeOption(profile) : null;
        })
        .filter((option): option is TemplateAssigneeOption => option != null),
    [allKnownProfiles, selectedAssignees]
  );

  const isLoading =
    isLoadingCurrentUserProfile || isLoadingBulkGetUserProfiles || isFetchingSuggest;
  const isDisabled = isSaving || isLoadingCurrentUserProfile || isLoadingBulkGetUserProfiles;
  const isInvalid = selectedAssignees.length > MAX_TEMPLATE_ASSIGNEES;

  const handleChange = useCallback(
    (currentOptions: Array<EuiComboBoxOptionOption<string>>) => {
      onChange(
        currentOptions.map((option) => assigneeOptionToStoredValue(option, allKnownProfiles))
      );
    },
    [allKnownProfiles, onChange]
  );

  const handleSelfAssign = useCallback(() => {
    if (!currentUserProfile) {
      return;
    }

    const alreadySelected = selectedAssignees.some(
      (assignee) => assignee.uid === currentUserProfile.uid
    );
    if (alreadySelected) {
      return;
    }

    onChange([
      ...selectedAssignees,
      {
        uid: currentUserProfile.uid,
        username: currentUserProfile.user.username,
      },
    ]);
  }, [currentUserProfile, onChange, selectedAssignees]);

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>, searchTerm: string, contentClassName: string) => {
      const { user, data } = option as TemplateAssigneeOption;
      const displayName = getUserDisplayName(user);

      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
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
              <EuiHighlight search={searchTerm} className={contentClassName}>
                {displayName}
              </EuiHighlight>
            </EuiFlexItem>
            {user.email && user.email !== displayName ? (
              <EuiFlexItem grow={false}>
                <EuiTextColor color="subdued">
                  <EuiHighlight search={searchTerm} className={contentClassName}>
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

  const isCurrentUserSelected = selectedAssignees.some(
    (assignee) => assignee.uid === currentUserProfile?.uid
  );

  return (
    <EuiFormRow
      label={label}
      fullWidth
      helpText={
        currentUserProfile ? (
          <EuiLink onClick={handleSelfAssign} disabled={isCurrentUserSelected || isDisabled}>
            {labels.assignYourself}
          </EuiLink>
        ) : undefined
      }
      isInvalid={isInvalid}
      error={isInvalid ? labels.maxAssigneesError : undefined}
      data-test-subj="templateAssigneesField"
    >
      <EuiComboBox
        fullWidth
        async
        isLoading={isLoading}
        options={options}
        selectedOptions={selectedOptions}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        onChange={handleChange}
        onSearchChange={setSearchValue}
        renderOption={renderOption}
        rowHeight={35}
        data-test-subj="templateAssigneesComboBox"
        aria-label={label}
      />
    </EuiFormRow>
  );
};
