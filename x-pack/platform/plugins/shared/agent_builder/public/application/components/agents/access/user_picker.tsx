/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, type EuiComboBoxOptionOption, EuiHighlight, EuiText } from '@elastic/eui';
import { useSuggestUsers, type SuggestedUser } from '../../../hooks/use_suggest_users';
import { accessFlyoutAddPeoplePlaceholder } from './access_i18n';

interface UserPickerProps {
  /** Usernames already added to the ACL (excluded from the dropdown). */
  excludedUsernames: string[];
  onAdd: (username: string) => void;
  isDisabled?: boolean;
}

interface UserOption extends EuiComboBoxOptionOption<string> {
  user: SuggestedUser;
}

const userToOption = (user: SuggestedUser): UserOption => ({
  label: user.full_name ? `${user.full_name} (${user.username})` : user.username,
  value: user.username,
  key: user.username,
  user,
});

export const UserPicker: React.FC<UserPickerProps> = ({ excludedUsernames, onAdd, isDisabled }) => {
  const { data: users, isLoading } = useSuggestUsers();
  const excludedSet = useMemo(() => new Set(excludedUsernames), [excludedUsernames]);

  const options = useMemo(
    () => (users ?? []).filter((u) => !excludedSet.has(u.username)).map(userToOption),
    [users, excludedSet]
  );

  const onChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const next = selected[0]?.value;
      if (next) onAdd(next);
    },
    [onAdd]
  );
  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>, searchValue: string) => {
      const { user } = option as UserOption;
      const primary = user.full_name ?? user.username;
      const secondary = user.full_name ? user.username : user.email;
      return (
        <div>
          <EuiText size="s">
            <EuiHighlight search={searchValue}>{primary}</EuiHighlight>
          </EuiText>
          {secondary ? (
            <EuiText size="xs" color="subdued">
              <EuiHighlight search={searchValue}>{secondary}</EuiHighlight>
            </EuiText>
          ) : null}
        </div>
      );
    },
    []
  );

  return (
    <EuiComboBox<string>
      placeholder={accessFlyoutAddPeoplePlaceholder}
      prepend="Add"
      options={options}
      selectedOptions={[]}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable={false}
      compressed
      renderOption={renderOption}
      rowHeight={44}
      data-test-subj="agentBuilderAclUserPicker"
    />
  );
};
