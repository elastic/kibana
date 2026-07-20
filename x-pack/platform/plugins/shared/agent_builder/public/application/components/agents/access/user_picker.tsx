/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import {
  UserAvatar,
  getUserDisplayName,
  type UserProfileWithAvatar,
} from '@kbn/user-profile-components';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useSuggestUsers } from '../../../hooks/use_suggest_users';
import { accessFlyoutAddPeoplePlaceholder } from './access_i18n';

interface UserPickerProps {
  /** Usernames already added to the ACL (excluded from the dropdown). */
  excludedUsernames: string[];
  onAdd: (username: string) => void;
  isDisabled?: boolean;
}

interface UserOption extends EuiComboBoxOptionOption<string> {
  profile: UserProfileWithAvatar;
}

const SEARCH_DEBOUNCE_MS = 200;

const profileToOption = (profile: UserProfileWithAvatar): UserOption => ({
  label: getUserDisplayName(profile.user),
  value: profile.user.username,
  key: profile.user.username,
  profile,
});

export const UserPicker: React.FC<UserPickerProps> = ({ excludedUsernames, onAdd, isDisabled }) => {
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);

  const { data: profiles, isFetching } = useSuggestUsers(debouncedSearch);
  const excludedSet = useMemo(() => new Set(excludedUsernames), [excludedUsernames]);

  const options = useMemo<UserOption[]>(
    () => (profiles ?? []).filter((p) => !excludedSet.has(p.user.username)).map(profileToOption),
    [profiles, excludedSet]
  );

  const onChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const next = selected[0]?.value;
      if (next) {
        onAdd(next);
        setSearchValue('');
      }
    },
    [onAdd]
  );

  const renderOption = useCallback((option: EuiComboBoxOptionOption<string>) => {
    const { profile } = option as UserOption;
    const displayName = getUserDisplayName(profile.user);
    const secondary = profile.user.email ?? profile.user.username;
    const showSecondary = secondary && secondary !== displayName;
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText size="s">{displayName}</EuiText>
          {showSecondary ? (
            <EuiText size="xs" color="subdued">
              {secondary}
            </EuiText>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, []);

  return (
    <div
      css={css`
        position: relative;
      `}
    >
      <EuiComboBox<string>
        placeholder={accessFlyoutAddPeoplePlaceholder}
        prepend="Add"
        options={options}
        selectedOptions={[]}
        onChange={onChange}
        onSearchChange={setSearchValue}
        singleSelection={{ asPlainText: true }}
        isLoading={isFetching}
        isDisabled={isDisabled}
        isClearable={false}
        compressed
        renderOption={renderOption}
        rowHeight={48}
        async
        data-test-subj="agentBuilderAclUserPicker"
      />
    </div>
  );
};
