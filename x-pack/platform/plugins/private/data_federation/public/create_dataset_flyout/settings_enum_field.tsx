/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiSuperSelect, EuiTextColor } from '@elastic/eui';
import type { Control, FieldPath, RegisterOptions } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import {
  useDatasetSettingDefaultHint,
  useDatasetSettingDefaultsShown,
  useSettingFieldText,
} from './dataset_settings_default_hints';
import { DefaultOptionBadge, buildSuperSelectOption } from './dataset_settings_super_select_utils';

export interface SettingsEnumOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface SettingsEnumFieldProps<T extends string> {
  control: Control<CreateDatasetFormValues>;
  name: FieldPath<CreateDatasetFormValues>;
  label: string;
  helpText?: string;
  /** Shorter phrasing of the help text, for flows that show it as a placeholder. */
  description?: string;
  placeholder: string;
  options: Array<SettingsEnumOption<T>>;
  'data-test-subj': string;
  rules?: RegisterOptions<CreateDatasetFormValues, FieldPath<CreateDatasetFormValues>>;
  /** Off where the field sits among a step's own fields rather than a settings panel. */
  isCompressed?: boolean;
}

/**
 * Renders a combo box where a cleared field falls back to a default, since only
 * the combo box carries EUI's clear button, and a super select otherwise.
 */
export function SettingsEnumField<T extends string>({
  control,
  name,
  label,
  helpText,
  description,
  placeholder,
  options,
  'data-test-subj': dataTestSubj,
  rules,
  isCompressed = true,
}: SettingsEnumFieldProps<T>): ReturnType<FunctionComponent> {
  const { field, fieldState } = useController({ name, control, rules });
  const defaultHint = useDatasetSettingDefaultHint(name);
  const isClearable = useDatasetSettingDefaultsShown();
  const fieldText = useSettingFieldText(name, { label, description, helpText, placeholder });

  const value = field.value as T | '';
  const isInvalid = Boolean(fieldState.error);

  const comboBoxOptions = useMemo(
    (): Array<EuiComboBoxOptionOption<T>> =>
      options.map((option) => ({
        label: option.label,
        value: option.value,
        ...(option.value === defaultHint?.value ? { append: <DefaultOptionBadge /> } : {}),
      })),
    [defaultHint?.value, options]
  );

  /** The badge belongs in the list, not on the value the field ends up showing. */
  const selectedOptions = useMemo((): Array<EuiComboBoxOptionOption<T>> => {
    if (!value) {
      return [];
    }

    const selectedOption = options.find((option) => option.value === value);

    return [{ label: selectedOption?.label ?? value, value }];
  }, [options, value]);

  const descriptionsByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option.description])),
    [options]
  );

  const renderOption = useCallback(
    (
      option: EuiComboBoxOptionOption<T>,
      _searchValue: string,
      contentClassName?: string
    ): ReturnType<FunctionComponent> => {
      const description = option.value ? descriptionsByValue.get(option.value) : undefined;

      if (!description) {
        return <span className={contentClassName}>{option.label}</span>;
      }

      return (
        <span className={contentClassName}>
          <strong>{option.label}</strong>
          <div>
            <EuiTextColor color="subdued">{description}</EuiTextColor>
          </div>
        </span>
      );
    },
    [descriptionsByValue]
  );

  const handleComboBoxChange = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<T>>) => {
      field.onChange(newSelectedOptions[0]?.value ?? '');
    },
    [field]
  );

  const superSelectOptions = useMemo(
    () => options.map((option) => buildSuperSelectOption(option)),
    [options]
  );

  const hasDescriptions = options.some((option) => Boolean(option.description));

  return (
    <EuiFormRow
      label={fieldText.label}
      helpText={fieldText.helpText}
      fullWidth
      isInvalid={isInvalid}
      error={fieldState.error?.message}
    >
      {isClearable ? (
        <EuiComboBox
          options={comboBoxOptions}
          selectedOptions={selectedOptions}
          onChange={handleComboBoxChange}
          renderOption={renderOption}
          rowHeight={hasDescriptions ? 'auto' : undefined}
          data-test-subj={dataTestSubj}
          fullWidth
          compressed={isCompressed}
          isClearable
          isInvalid={isInvalid}
          aria-label={label}
          placeholder={fieldText.placeholder}
          singleSelection={{ asPlainText: true }}
          inputRef={field.ref}
        />
      ) : (
        <EuiSuperSelect
          options={superSelectOptions}
          data-test-subj={dataTestSubj}
          fullWidth
          compressed={isCompressed}
          aria-label={label}
          placeholder={placeholder}
          valueOfSelected={value || undefined}
          onChange={(nextValue) => field.onChange(nextValue)}
          name={field.name}
          buttonRef={field.ref}
          isInvalid={isInvalid}
        />
      )}
    </EuiFormRow>
  );
}
