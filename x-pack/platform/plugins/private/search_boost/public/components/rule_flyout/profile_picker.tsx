/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiBadge, EuiComboBox } from '@elastic/eui';

import type { BoostProfile, BoostProfileType } from '../../../common/types';
import { MANAGED_PROFILE_BADGE, PROFILE_TYPE_LABELS } from '../../translations';
import { PROFILE_LABEL, PROFILE_NO_MATCH } from './translations';

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

const getProfileOptions = (
  profiles: readonly BoostProfile[],
  lockedType?: BoostProfileType
): Array<EuiComboBoxOptionOption<string>> =>
  PROFILE_TYPES.filter((type) => !lockedType || type === lockedType)
    .map((type) => ({
      label: PROFILE_TYPE_LABELS[type],
      options: profiles
        .filter((profile) => profile.type === type)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ name, is_builtin: isBuiltin }) => ({
          label: name,
          key: name,
          append: isBuiltin ? (
            <EuiBadge color="hollow">{MANAGED_PROFILE_BADGE}</EuiBadge>
          ) : undefined,
          'data-test-subj': `searchBoostRuleFlyoutProfileOption-${name}`,
        })),
    }))
    .filter(({ options }) => options.length > 0);

const getSelectedProfileOptions = (
  profile?: BoostProfile
): Array<EuiComboBoxOptionOption<string>> =>
  profile
    ? [
        {
          label: profile.name,
          key: profile.name,
          append: (
            <EuiBadge color="hollow" data-test-subj="searchBoostRuleFlyoutProfileType">
              {PROFILE_TYPE_LABELS[profile.type]}
            </EuiBadge>
          ),
        },
      ]
    : [];

export interface ProfilePickerProps {
  profiles: readonly BoostProfile[];
  lockedType?: BoostProfileType;
  value: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
  onChange: (profileName: string) => void;
  onBlur: () => void;
  // `id` and `aria-describedby` are passed in by `EuiFormRow`.
  id?: string;
  'aria-describedby'?: string;
}

/**
 * A searchable picker of boost profiles, grouped by type and sorted by name,
 * with Elastic-managed ones marked.
 */
export const ProfilePicker = ({
  profiles,
  lockedType,
  value,
  isDisabled,
  isInvalid,
  inputRef,
  onChange,
  onBlur,
  id,
  'aria-describedby': ariaDescribedBy,
}: ProfilePickerProps) => {
  const options = useMemo(() => getProfileOptions(profiles, lockedType), [profiles, lockedType]);
  const selectedProfile = profiles.find(({ name }) => name === value);

  return (
    <EuiComboBox
      id={id}
      aria-label={PROFILE_LABEL}
      aria-describedby={ariaDescribedBy}
      fullWidth
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      options={options}
      selectedOptions={getSelectedProfileOptions(selectedProfile)}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      inputRef={inputRef}
      onChange={([option]) => {
        if (option) {
          onChange(option.label);
        }
      }}
      // Creating nothing makes EuiComboBox drop text that matches no profile on blur or
      // Enter, which restores the selected profile.
      onCreateOption={() => {}}
      customOptionText={PROFILE_NO_MATCH}
      onBlur={onBlur}
      data-test-subj="searchBoostRuleFlyoutProfile"
    />
  );
};
