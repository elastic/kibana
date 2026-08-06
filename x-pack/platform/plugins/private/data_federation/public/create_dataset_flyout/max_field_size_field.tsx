/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useState } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { ByteSizeUnitButton } from './byte_size_unit_button';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import { validateMaxFieldSize } from './create_dataset_flyout_form_state';
import {
  bytesToDisplayValue,
  displayValueToBytes,
  formatMaxFieldSizeDisplayValue,
  getMaxFieldSizeDisplayState,
  parseStoredMaxFieldSizeBytes,
  type ByteSizeUnit,
} from './max_field_size_utils';

export interface MaxFieldSizeFieldProps {
  control: Control<CreateDatasetFormValues>;
  testSubjPrefix: string;
}

export const MaxFieldSizeField: FunctionComponent<MaxFieldSizeFieldProps> = ({
  control,
  testSubjPrefix,
}) => {
  const { field, fieldState } = useController({
    name: 'settings.max_field_size',
    control,
    rules: { validate: validateMaxFieldSize },
  });

  const initialDisplayState = getMaxFieldSizeDisplayState(field.value);
  const [displayValue, setDisplayValue] = useState(initialDisplayState.displayValue);
  const [unit, setUnit] = useState<ByteSizeUnit>(initialDisplayState.unit);

  useEffect(() => {
    const nextDisplayState = getMaxFieldSizeDisplayState(field.value);
    setDisplayValue(nextDisplayState.displayValue);
    setUnit(nextDisplayState.unit);
  }, [field.value]);

  const handleDisplayChange = (nextDisplay: string) => {
    setDisplayValue(nextDisplay);

    if (!nextDisplay.trim()) {
      field.onChange('');
      return;
    }

    const numeric = Number(nextDisplay);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return;
    }

    field.onChange(String(displayValueToBytes(numeric, unit)));
  };

  const handleUnitChange = (nextUnit: ByteSizeUnit) => {
    setUnit(nextUnit);

    const bytes = parseStoredMaxFieldSizeBytes(field.value);
    if (bytes === undefined) {
      return;
    }

    setDisplayValue(formatMaxFieldSizeDisplayValue(bytesToDisplayValue(bytes, nextUnit)));
  };

  return (
    <EuiFormRow
      label={createDatasetFlyoutStrings.settingsMaxFieldSizeLabel()}
      helpText={createDatasetFlyoutStrings.settingsMaxFieldSizeHelp()}
      fullWidth
      isInvalid={Boolean(fieldState.error)}
      error={fieldState.error?.message}
    >
      <EuiFieldNumber
        data-test-subj={`${testSubjPrefix}SettingsMaxFieldSize`}
        fullWidth
        compressed
        min={0}
        step="any"
        isInvalid={Boolean(fieldState.error)}
        value={displayValue}
        onChange={(event) => handleDisplayChange(event.target.value)}
        name={field.name}
        inputRef={field.ref}
        append={
          <ByteSizeUnitButton
            value={unit}
            onChange={handleUnitChange}
            aria-label={createDatasetFlyoutStrings.settingsMaxFieldSizeUnitAriaLabel()}
            data-test-subj={`${testSubjPrefix}SettingsMaxFieldSizeUnit`}
          />
        }
      />
    </EuiFormRow>
  );
};
