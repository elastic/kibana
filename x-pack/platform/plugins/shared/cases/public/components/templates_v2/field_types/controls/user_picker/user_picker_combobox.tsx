/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHighlight,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { bringCurrentUserToFrontAndSort } from '../../../../user_profiles/sort';
import type { SelectedUser, UserProfileOption } from './utils';
import { profileToOption } from './utils';
import { OptionalFieldLabel } from '../../../../optional_field_label';

export interface UserPickerComboboxProps {
  label?: string;
  name: string;
  isInvalid: boolean;
  errorMessage: string | null;
  isLoading: boolean;
  isLoadingBulk: boolean;
  isMultiple: boolean;
  isRequired: boolean;
  selectedUsers: SelectedUser[];
  allKnownProfiles: UserProfileWithAvatar[];
  onChange: (next: SelectedUser[]) => void;
  onSearchChange: (value: string) => void;
}

export const UserPickerCombobox: React.FC<UserPickerComboboxProps> = ({
  label,
  name,
  isInvalid,
  errorMessage,
  isLoading,
  isLoadingBulk,
  isMultiple,
  isRequired,
  selectedUsers,
  allKnownProfiles,
  onChange,
  onSearchChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const options = useMemo(
    () => (bringCurrentUserToFrontAndSort(undefined, allKnownProfiles) ?? []).map(profileToOption),
    [allKnownProfiles]
  );

  const selectedOptions: UserProfileOption[] = useMemo(
    () =>
      selectedUsers
        .map(({ uid }) => {
          const profile = allKnownProfiles.find((p) => p.uid === uid);
          return profile ? profileToOption(profile) : null;
        })
        .filter((o): o is UserProfileOption => o != null),
    [selectedUsers, allKnownProfiles]
  );

  const handleChange = useCallback(
    (currentOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const next: SelectedUser[] = currentOptions.map((opt) => {
        const profile = allKnownProfiles.find((p) => p.uid === opt.value);
        return {
          uid: opt.value ?? '',
          name: profile ? getUserDisplayName(profile.user) : opt.label,
        };
      });
      onChange(next);
    },
    [allKnownProfiles, onChange]
  );

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>, searchValue: string, contentClassName: string) => {
      const { user, data } = option as UserProfileOption;
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

  return (
    <EuiFormRow
      label={label}
      labelAppend={!isRequired ? OptionalFieldLabel : undefined}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
    >
      <EuiComboBox
        isInvalid={isInvalid}
        fullWidth
        async
        isLoading={isLoading || isLoadingBulk}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onSearchChange={onSearchChange}
        renderOption={renderOption}
        singleSelection={isMultiple ? undefined : { asPlainText: true }}
        rowHeight={(euiTheme.base / 2) * 5}
        data-test-subj={`template-user-picker-${name}`}
      />
    </EuiFormRow>
  );
};

UserPickerCombobox.displayName = 'UserPickerCombobox';
