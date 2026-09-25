/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { type CreateDatasetFormValues } from '../create_dataset_form_state';
import { DatetimeFormatComboBox } from '../../components/datetime_format_combo_box';

export function DatetimeFormatSelect({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: datetimeFormatField } = useController({
    name: 'settings.datetime_format',
    control,
  });

  return (
    <DatetimeFormatComboBox
      value={datetimeFormatField.value ?? ''}
      onChange={(next) => datetimeFormatField.onChange(next)}
      onBlur={datetimeFormatField.onBlur}
      placeholder={createDatasetWizardStrings.settingsDatetimeFormatPlaceholder}
      data-test-subj="createDatasetSettingsDatetimeFormat"
      aria-label={createDatasetWizardStrings.settingsDatetimeFormatLabel}
    />
  );
}
