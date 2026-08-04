/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiSuperSelect } from '@elastic/eui';
import type { Control, FieldPath, RegisterOptions } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import {
  buildSuperSelectOption,
  PRESET_CUSTOM_VALUE,
} from './dataset_settings_super_select_utils';

export interface SettingsPresetSuperSelectProps {
  control: Control<CreateDatasetFormValues>;
  name: FieldPath<CreateDatasetFormValues>;
  label: string;
  helpText?: string;
  placeholder: string;
  presets: Array<{ value: string; label: string; description?: string }>;
  'data-test-subj': string;
  customFieldTestSubj: string;
  rules?: RegisterOptions<CreateDatasetFormValues, FieldPath<CreateDatasetFormValues>>;
}

export const SettingsPresetSuperSelect: FunctionComponent<SettingsPresetSuperSelectProps> = ({
  control,
  name,
  label,
  helpText,
  placeholder,
  presets,
  'data-test-subj': dataTestSubj,
  customFieldTestSubj,
  rules,
}) => {
  const { field, fieldState } = useController({ name, control, rules });

  const presetValues = useMemo(() => presets.map((preset) => preset.value), [presets]);
  const isCustomValue = Boolean(field.value) && !presetValues.includes(field.value);
  const selectedValue = isCustomValue ? PRESET_CUSTOM_VALUE : field.value || '';

  const superSelectOptions = useMemo(
    () => [
      buildSuperSelectOption({ value: '', label: placeholder }),
      ...presets.map((preset) => buildSuperSelectOption(preset)),
      buildSuperSelectOption({
        value: PRESET_CUSTOM_VALUE,
        label: createDatasetFlyoutStrings.settingsPresetCustom(),
        description: createDatasetFlyoutStrings.settingsPresetCustomPlaceholder(),
      }),
    ],
    [placeholder, presets]
  );

  return (
    <>
      <EuiFormRow
        label={label}
        helpText={!isCustomValue && selectedValue !== PRESET_CUSTOM_VALUE ? helpText : undefined}
        fullWidth
        isInvalid={Boolean(fieldState.error)}
        error={fieldState.error?.message}
      >
        <EuiSuperSelect
          options={superSelectOptions}
          data-test-subj={dataTestSubj}
          fullWidth
          aria-label={label}
          placeholder={placeholder}
          valueOfSelected={selectedValue || undefined}
          onChange={(value) => {
            if (value === PRESET_CUSTOM_VALUE) {
              if (presetValues.includes(field.value)) {
                field.onChange('');
              }
              return;
            }
            field.onChange(value);
          }}
          name={field.name}
          buttonRef={field.ref}
          isInvalid={Boolean(fieldState.error)}
        />
      </EuiFormRow>
      {isCustomValue || selectedValue === PRESET_CUSTOM_VALUE ? (
        <>
          <EuiSpacer size="s" />
          <EuiFormRow label={label} helpText={helpText} fullWidth>
            <EuiFieldText
              data-test-subj={customFieldTestSubj}
              fullWidth
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              name={field.name}
              inputRef={field.ref}
              placeholder={createDatasetFlyoutStrings.settingsPresetCustomPlaceholder()}
            />
          </EuiFormRow>
        </>
      ) : null}
    </>
  );
};
