/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import moment from 'moment-timezone';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiDatePicker,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSuperSelect,
  EuiTextArea,
} from '@elastic/eui';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useGetCategories } from '../../../containers/use_get_categories';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { CategoryComponent } from '../../category/category_component';
import { useCasesContext } from '../../cases_context/use_cases_context';
import type { SelectedUser } from '../../templates_v2/field_types/controls/user_picker/utils';
import * as i18n from './translations';

/**
 * The inputs an "Other …" card holds, one per kind of field. Each reports its raw value; the row
 * decides what an empty value means.
 */

interface TextInputProps {
  fieldLabel: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
}

export const OtherTextInput: React.FC<TextInputProps> = ({
  fieldLabel,
  value,
  onChange,
  maxLength,
  multiline = false,
  isDisabled = false,
  placeholder,
}) => {
  const help = maxLength != null ? i18n.CHARACTERS_COUNT(value.length, maxLength) : undefined;
  const isInvalid = maxLength != null && value.length > maxLength;
  return (
    <EuiFormRow
      fullWidth
      helpText={isInvalid ? undefined : help}
      error={help}
      isInvalid={isInvalid}
    >
      {multiline ? (
        <EuiTextArea
          fullWidth
          compressed
          rows={5}
          value={value}
          placeholder={placeholder}
          isInvalid={isInvalid}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
          aria-label={i18n.OTHER_INPUT_ARIA(fieldLabel)}
          data-test-subj="merge-other-input"
        />
      ) : (
        <EuiFieldText
          fullWidth
          compressed
          autoFocus
          value={value}
          placeholder={placeholder}
          isInvalid={isInvalid}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
          aria-label={i18n.OTHER_INPUT_ARIA(fieldLabel)}
          data-test-subj="merge-other-input"
        />
      )}
    </EuiFormRow>
  );
};
OtherTextInput.displayName = 'OtherTextInput';

interface NumberInputProps {
  fieldLabel: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  isDisabled?: boolean;
}

export const OtherNumberInput: React.FC<NumberInputProps> = ({
  fieldLabel,
  value,
  onChange,
  min,
  max,
  isDisabled = false,
}) => {
  const numeric = value.trim().length > 0 ? Number(value) : null;
  const isInvalid =
    numeric != null &&
    (Number.isNaN(numeric) || (min != null && numeric < min) || (max != null && numeric > max));
  const range = i18n.NUMBER_RANGE(min, max);
  return (
    <EuiFormRow helpText={isInvalid ? undefined : range} error={range} isInvalid={isInvalid}>
      <EuiFieldNumber
        compressed
        autoFocus
        value={value}
        min={min}
        max={max}
        isInvalid={isInvalid}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label={i18n.OTHER_INPUT_ARIA(fieldLabel)}
        data-test-subj="merge-other-input"
      />
    </EuiFormRow>
  );
};
OtherNumberInput.displayName = 'OtherNumberInput';

interface DateInputProps {
  fieldLabel: string;
  /** A UTC ISO string, or empty. */
  value: string;
  onChange: (value: string) => void;
  showTime?: boolean;
  timezone?: string;
  isDisabled?: boolean;
}

/** Follows the template date picker: local or UTC display, stored as a UTC ISO string. */
export const OtherDateInput: React.FC<DateInputProps> = ({
  fieldLabel,
  value,
  onChange,
  showTime = false,
  timezone,
  isDisabled = false,
}) => {
  const isLocal = timezone === 'local';
  const selected = value ? (isLocal ? moment(value) : moment.utc(value)) : null;
  return (
    <EuiDatePicker
      compressed
      selected={selected}
      showTimeSelect={showTime}
      utcOffset={isLocal ? undefined : 0}
      disabled={isDisabled}
      onChange={(date) => onChange(date != null ? date.clone().utc().toISOString() : '')}
      aria-label={i18n.OTHER_INPUT_ARIA(fieldLabel)}
      data-test-subj="merge-other-input"
    />
  );
};
OtherDateInput.displayName = 'OtherDateInput';

interface SelectInputProps {
  fieldLabel: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}

/** The template's options that no case holds. */
export const OtherSelectInput: React.FC<SelectInputProps> = ({
  fieldLabel,
  options,
  value,
  onChange,
  isDisabled = false,
}) => (
  <EuiSuperSelect
    compressed
    fullWidth
    options={options.map((option) => ({ value: option, inputDisplay: option }))}
    valueOfSelected={options.includes(value) ? value : ''}
    placeholder={options.length > 0 ? i18n.CHOOSE_AN_OPTION : i18n.NO_OTHER_OPTIONS}
    disabled={isDisabled || options.length === 0}
    onChange={onChange}
    aria-label={i18n.OTHER_INPUT_ARIA(fieldLabel)}
    data-test-subj="merge-other-input"
  />
);
OtherSelectInput.displayName = 'OtherSelectInput';

interface UserInputProps {
  fieldLabel: string;
  value: SelectedUser | null;
  onChange: (user: SelectedUser | null) => void;
  isDisabled?: boolean;
}

/** Searches the users who can access Cases in this solution. */
export const OtherUserInput: React.FC<UserInputProps> = ({
  fieldLabel,
  value,
  onChange,
  isDisabled = false,
}) => {
  const { owner } = useCasesContext();
  const [search, setSearch] = useState('');
  const { data: profiles = [], isFetching } = useSuggestUserProfiles({
    name: search,
    owners: owner,
  });
  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      profiles.map((profile) => ({ label: getUserDisplayName(profile.user), value: profile.uid })),
    [profiles]
  );
  return (
    <EuiComboBox
      compressed
      fullWidth
      async
      isLoading={isFetching}
      singleSelection={{ asPlainText: true }}
      placeholder={i18n.SEARCH_USERS}
      options={options}
      selectedOptions={value != null ? [{ label: value.name, value: value.uid }] : []}
      onSearchChange={setSearch}
      isDisabled={isDisabled}
      onChange={(selected) => {
        const [picked] = selected;
        onChange(picked?.value != null ? { uid: picked.value, name: picked.label } : null);
      }}
      aria-label={i18n.OTHER_INPUT_ARIA(fieldLabel)}
      data-test-subj="merge-other-input"
    />
  );
};
OtherUserInput.displayName = 'OtherUserInput';

interface CategoryInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  isDisabled?: boolean;
}

/** The category picker from the case page: an existing category, or a new one typed in. */
export const OtherCategoryInput: React.FC<CategoryInputProps> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const { data: categories = [], isLoading } = useGetCategories();
  return (
    <CategoryComponent
      isLoading={isLoading}
      availableCategories={categories}
      category={value}
      onChange={onChange}
      isDisabled={isDisabled}
    />
  );
};
OtherCategoryInput.displayName = 'OtherCategoryInput';
