/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiLink } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName } from '@kbn/user-profile-components';
import type { CaseTaskAssignee } from '../../../common/types/domain/task/v1';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useIsUserTyping } from '../../common/use_is_user_typing';
import { bringCurrentUserToFrontAndSort } from '../user_profiles/sort';
import * as i18n from './translations';

type Option = EuiComboBoxOptionOption<string>;

const toOption = (profile: UserProfileWithAvatar): Option => ({
  label: getUserDisplayName(profile.user),
  value: profile.uid,
  key: profile.uid,
});

interface TaskAssigneesFieldProps {
  value: CaseTaskAssignee[];
  onChange: (assignees: CaseTaskAssignee[]) => void;
}

export const TaskAssigneesField: React.FC<TaskAssigneesFieldProps> = ({ value, onChange }) => {
  const { owner } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const { onContentChange, onDebounce } = useIsUserTyping();

  const { data: currentUserProfile } = useGetCurrentUserProfile();
  const { data: suggested = [], isLoading: isLoadingSuggestions } = useSuggestUserProfiles({
    name: searchTerm,
    owners: owner,
    onDebounce,
  });

  // Selected users that are not in the current suggestions still need a display name.
  const missingUids = value
    .map(({ uid }) => uid)
    .filter((uid) => !suggested.some((profile) => profile.uid === uid));
  const { data: selectedProfiles = new Map<string, UserProfileWithAvatar>() } =
    useBulkGetUserProfiles({ uids: missingUids });

  const options = useMemo(
    () =>
      (
        bringCurrentUserToFrontAndSort(currentUserProfile, [
          ...suggested,
          ...selectedProfiles.values(),
        ]) ?? []
      ).map(toOption),
    [currentUserProfile, selectedProfiles, suggested]
  );

  const selectedOptions = useMemo(
    () =>
      value.map(
        ({ uid }) =>
          options.find((option) => option.key === uid) ?? { label: uid, key: uid, value: uid }
      ),
    [options, value]
  );

  const onSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term);
      onContentChange(term);
    },
    [onContentChange]
  );

  const assignSelf = useCallback(() => {
    if (currentUserProfile && !value.some(({ uid }) => uid === currentUserProfile.uid)) {
      onChange([...value, { uid: currentUserProfile.uid }]);
    }
  }, [currentUserProfile, onChange, value]);

  return (
    <EuiFormRow
      label={i18n.FIELD_ASSIGNEES}
      labelAppend={
        currentUserProfile ? (
          <EuiLink onClick={assignSelf} data-test-subj="cases-task-assign-self">
            {i18n.ASSIGN_MYSELF}
          </EuiLink>
        ) : undefined
      }
      fullWidth
    >
      <EuiComboBox<string>
        fullWidth
        async
        placeholder={i18n.SEARCH_USERS}
        isLoading={isLoadingSuggestions}
        options={options}
        selectedOptions={selectedOptions}
        onSearchChange={onSearchChange}
        onChange={(selected) => onChange(selected.map(({ key }) => ({ uid: key as string })))}
        data-test-subj="cases-task-assignees"
      />
    </EuiFormRow>
  );
};

TaskAssigneesField.displayName = 'TaskAssigneesField';
