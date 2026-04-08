/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import type { z } from '@kbn/zod/v4';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHighlight,
  EuiTextColor,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  UseField,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type {
  UserPickerFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED, INVALID_USER_PROFILES } from '../../translations';
import { useSuggestUserProfiles } from '../../../../containers/user_profiles/use_suggest_user_profiles';
import { useBulkGetUserProfiles } from '../../../../containers/user_profiles/use_bulk_get_user_profiles';
import { bulkGetUserProfiles } from '../../../../containers/user_profiles/api';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { useAvailableCasesOwners } from '../../../app/use_available_owners';
import { getAllPermissionsExceptFrom } from '../../../../utils/permissions';
import { useIsUserTyping } from '../../../../common/use_is_user_typing';
import { bringCurrentUserToFrontAndSort } from '../../../user_profiles/sort';
import { useKibana } from '../../../../common/lib/kibana';

export interface SelectedUser {
  uid: string;
  name: string;
}

type UserPickerProps = z.infer<typeof UserPickerFieldSchema> & ConditionRenderProps;

type UserProfileOption = EuiComboBoxOptionOption<string> & UserProfileWithAvatar;

const toSelectedUsers = (value: unknown): SelectedUser[] => {
  if (Array.isArray(value)) return value as SelectedUser[];
  if (typeof value === 'string' && value !== '') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const profileToOption = (profile: UserProfileWithAvatar): UserProfileOption => ({
  ...profile,
  label: getUserDisplayName(profile.user),
  value: profile.uid,
  key: profile.uid,
});

interface UserPickerInnerProps {
  label?: string;
  name: string;
  isInvalid: boolean;
  errorMessage: string | null;
  isLoading: boolean;
  isMultiple: boolean;
  selectedUsers: SelectedUser[];
  suggestedProfiles: UserProfileWithAvatar[];
  missingUids: string[];
  renderOption: (
    option: EuiComboBoxOptionOption<string>,
    searchValue: string,
    contentClassName: string
  ) => React.ReactNode;
  onSearchChange: (value: string) => void;
  onChange: (next: SelectedUser[]) => void;
}

const UserPickerInner: React.FC<UserPickerInnerProps> = ({
  label,
  name,
  isInvalid,
  errorMessage,
  isLoading,
  isMultiple,
  selectedUsers,
  suggestedProfiles,
  missingUids,
  renderOption,
  onSearchChange,
  onChange,
}) => {
  const { data: bulkProfiles = new Map(), isFetching: isLoadingBulk } = useBulkGetUserProfiles({
    uids: missingUids,
  });

  const allKnownProfiles = useMemo(
    () => [...suggestedProfiles, ...Array.from(bulkProfiles.values())],
    [suggestedProfiles, bulkProfiles]
  );

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

  return (
    <EuiFormRow label={label} error={errorMessage} isInvalid={isInvalid} fullWidth>
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
        rowHeight={35}
        data-test-subj={`template-user-picker-${name}`}
      />
    </EuiFormRow>
  );
};

UserPickerInner.displayName = 'UserPickerInner';

export const UserPicker: React.FC<UserPickerProps> = ({
  label,
  name,
  type,
  metadata,
  isRequired,
}) => {
  const { owner: owners } = useCasesContext();
  const availableOwners = useAvailableCasesOwners(getAllPermissionsExceptFrom('delete'));
  const hasOwners = owners.length > 0;
  const { security } = useKibana().services;

  const [searchTerm, setSearchTerm] = useState('');
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();

  const {
    data: suggestedProfiles = [],
    isLoading: isLoadingSuggest,
    isFetching: isFetchingSuggest,
  } = useSuggestUserProfiles({
    name: searchTerm,
    owners: hasOwners ? owners : availableOwners,
    onDebounce,
  });

  const isLoading = isLoadingSuggest || isFetchingSuggest || isUserTyping;
  const isMultiple = metadata?.multiple !== false;

  const validations = useMemo(() => {
    const validators = [];

    if (isRequired) {
      validators.push({
        validator: ({ value }: { value: unknown }) => {
          if (toSelectedUsers(value).length === 0) {
            return { message: FIELD_REQUIRED };
          }
        },
      });
    }

    validators.push({
      validator: async ({ value }: { value: unknown }) => {
        const users = toSelectedUsers(value);
        if (users.length === 0) return;

        const profiles = await bulkGetUserProfiles({
          security,
          uids: users.map((u) => u.uid),
        });
        const profileMap = new Map(profiles.map((p) => [p.uid, p]));

        const invalid = users.filter((u) => {
          const profile = profileMap.get(u.uid);
          if (!profile) return true;
          return getUserDisplayName(profile.user) !== u.name;
        });

        if (invalid.length > 0) {
          return { message: INVALID_USER_PROFILES(invalid.map((u) => u.name)) };
        }
      },
    });

    return validators;
  }, [isRequired, security]);

  const serializedDefault = JSON.stringify(metadata?.default ?? []);

  const fieldConfig = useMemo(
    () => ({ validations, defaultValue: serializedDefault }),
    [validations, serializedDefault]
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

  const onSearchChange = useCallback(
    (value: string) => {
      if (!isEmpty(value)) {
        setSearchTerm(value);
      }
      onContentChange(value);
    },
    [onContentChange]
  );

  const renderField = useCallback(
    (field: FieldHook<string>) => {
      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
      const selectedUsers = toSelectedUsers(field.value);
      const missingUids = selectedUsers
        .filter((u) => !suggestedProfiles.some((p) => p.uid === u.uid))
        .map((u) => u.uid);

      return (
        <UserPickerInner
          label={label}
          name={name}
          isInvalid={isInvalid}
          errorMessage={errorMessage}
          isLoading={isLoading}
          isMultiple={isMultiple}
          selectedUsers={selectedUsers}
          suggestedProfiles={suggestedProfiles}
          missingUids={missingUids}
          renderOption={renderOption}
          onSearchChange={onSearchChange}
          onChange={(next) => field.setValue(JSON.stringify(next))}
        />
      );
    },
    [label, name, isLoading, isMultiple, suggestedProfiles, renderOption, onSearchChange]
  );

  return (
    <UseField key={name} path={`${CASE_EXTENDED_FIELDS}.${name}_as_${type}`} config={fieldConfig}>
      {renderField}
    </UseField>
  );
};

UserPicker.displayName = 'UserPicker';
