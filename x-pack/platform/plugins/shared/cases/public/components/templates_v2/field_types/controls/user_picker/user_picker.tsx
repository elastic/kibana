/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import type { z } from '@kbn/zod/v4';
import { Controller, useFormContext } from 'react-hook-form';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { InlineFieldActions } from '../inline_field_actions';
import { CASE_EXTENDED_FIELDS } from '../../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../../common/utils';
import type {
  UserPickerFieldSchema,
  ConditionRenderProps,
} from '../../../../../../common/types/domain/template/fields';
import { useSuggestUserProfiles } from '../../../../../containers/user_profiles/use_suggest_user_profiles';
import { useAvailableCasesOwners } from '../../../../app/use_available_owners';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { useIsUserTyping } from '../../../../../common/use_is_user_typing';
import { useKibana } from '../../../../../common/lib/kibana';
import { getAllPermissionsExceptFrom } from '../../../../../utils/permissions';
import { useUserPickerProfiles } from './use_user_picker_profiles';
import { useUserPickerValidators } from './use_user_picker_validators';
import type { SelectedUser } from './utils';
import { toSelectedUsers } from './utils';
import { UserPickerCombobox } from './user_picker_combobox';

type UserPickerProps = z.infer<typeof UserPickerFieldSchema> & ConditionRenderProps;

export const UserPicker: React.FC<UserPickerProps> = ({
  label,
  name,
  type,
  metadata,
  isRequired,
  onConfirm,
  isSaving,
  isSaveDisabled,
}) => {
  const { control, resetField } = useFormContext();
  const path = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`;

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
  const suggestedUids = useMemo(
    () => new Set(suggestedProfiles.map(({ uid }) => uid)),
    [suggestedProfiles]
  );

  const rules = useUserPickerValidators({ isRequired: isRequired ?? false, security });

  const defaultValue = useMemo(() => JSON.stringify(metadata?.default ?? []), [metadata?.default]);

  const onSearchChange = useCallback(
    (value: string) => {
      if (!isEmpty(value)) {
        setSearchTerm(value);
      }
      onContentChange(value);
    },
    [onContentChange]
  );

  const handleCancel = useCallback(() => {
    resetField(path);
  }, [path, resetField]);

  return (
    <Controller
      key={name}
      name={path}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field, fieldState }) => {
        const selectedUsers = toSelectedUsers(field.value);
        const missingUids = selectedUsers.reduce<string[]>((uids, { uid }) => {
          if (!suggestedUids.has(uid)) uids.push(uid);
          return uids;
        }, []);

        return (
          <>
            <UserPickerComboboxWithProfiles
              label={label}
              name={name}
              isInvalid={Boolean(fieldState.error)}
              errorMessage={fieldState.error?.message ?? null}
              isLoading={isLoading}
              isMultiple={isMultiple}
              isRequired={isRequired ?? false}
              isDisabled={isSaving}
              selectedUsers={selectedUsers}
              suggestedProfiles={suggestedProfiles}
              missingUids={missingUids}
              onSearchChange={onSearchChange}
              onChange={(next) => {
                field.onChange(JSON.stringify(next));
                field.onBlur();
              }}
            />
            {fieldState.isDirty && onConfirm && (
              <InlineFieldActions
                name={name}
                onConfirm={onConfirm}
                onCancel={handleCancel}
                isLoading={isSaving}
                isDisabled={isSaveDisabled}
              />
            )}
          </>
        );
      }}
    />
  );
};

UserPicker.displayName = 'UserPicker';

interface UserPickerComboboxWithProfilesProps {
  label?: string;
  name: string;
  isInvalid: boolean;
  errorMessage: string | null;
  isLoading: boolean;
  isMultiple: boolean;
  isRequired: boolean;
  isDisabled?: boolean;
  selectedUsers: SelectedUser[];
  suggestedProfiles: UserProfileWithAvatar[];
  missingUids: string[];
  onSearchChange: (value: string) => void;
  onChange: (next: SelectedUser[]) => void;
}

const UserPickerComboboxWithProfiles: React.FC<UserPickerComboboxWithProfilesProps> = ({
  suggestedProfiles,
  missingUids,
  ...rest
}) => {
  const { allKnownProfiles, isLoadingBulk } = useUserPickerProfiles({
    suggestedProfiles,
    missingUids,
  });

  return (
    <UserPickerCombobox
      {...rest}
      allKnownProfiles={allKnownProfiles}
      isLoadingBulk={isLoadingBulk}
    />
  );
};

UserPickerComboboxWithProfiles.displayName = 'UserPickerComboboxWithProfiles';
