/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFieldText, EuiFormRow, EuiText } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  DEFAULT_DATETIME_FORMAT,
  type CreateDatasetFormValues,
} from '../create_dataset_form_state';

const helpTextDefault = (valueLabel: string) => (
  <EuiText size="xs" color="subdued">
    <EuiCode>{valueLabel}</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

export function NdjsonCommonSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: datetimeFormatField } = useController({
    name: 'settings.datetime_format',
    control,
  });

  return (
    <div data-test-subj="createDatasetNdjsonCommonSettings">
      <EuiFormRow
        label={createDatasetWizardStrings.settingsDatetimeFormatLabel}
        helpText={helpTextDefault(DEFAULT_DATETIME_FORMAT)}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsDatetimeFormat"
          fullWidth
          placeholder={createDatasetWizardStrings.settingsDatetimeFormatPlaceholder}
          value={datetimeFormatField.value}
          onChange={(e) => datetimeFormatField.onChange(e.target.value)}
          name={datetimeFormatField.name}
          inputRef={datetimeFormatField.ref}
        />
      </EuiFormRow>
    </div>
  );
}
