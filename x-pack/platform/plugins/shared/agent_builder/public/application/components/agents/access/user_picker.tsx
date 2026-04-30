/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';
import { useSuggestUsers, type SuggestedUser } from '../../../hooks/use_suggest_users';
import { accessFlyoutAddPeoplePlaceholder } from './access_i18n';

interface UserPickerProps {
  /** Usernames already added to the ACL (excluded from the dropdown). */
  excludedUsernames: string[];
  onAdd: (username: string) => void;
  isDisabled?: boolean;
}

const userToOption = (user: SuggestedUser): EuiComboBoxOptionOption<string> => ({
  label: user.full_name ? `${user.full_name} (${user.username})` : user.username,
  value: user.username,
  key: user.username,
});

export const UserPicker: React.FC<UserPickerProps> = ({
  excludedUsernames,
  onAdd,
  isDisabled,
}) => {
  const { data: users, isLoading } = useSuggestUsers();
  const excludedSet = useMemo(() => new Set(excludedUsernames), [excludedUsernames]);

  const options = useMemo(
    () => (users ?? []).filter((u) => !excludedSet.has(u.username)).map(userToOption),
    [users, excludedSet]
  );

  const onChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const next = selected[0]?.value;
      if (next) {
        onAdd(next);
      }
    },
    [onAdd]
  );

  return (
    <EuiComboBox<string>
      placeholder={accessFlyoutAddPeoplePlaceholder}
      options={options}
      selectedOptions={[]}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable={false}
      data-test-subj="agentBuilderAclUserPicker"
    />
  );
};
