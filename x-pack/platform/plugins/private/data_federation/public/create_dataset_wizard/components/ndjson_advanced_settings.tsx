/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { type CreateDatasetFormValues } from '../create_dataset_form_state';
import { FormRowLabelWithInfo } from './form_row_label_with_info';

export function NdjsonAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: datetimeFormatField } = useController({
    name: 'settings.datetime_format',
    control,
  });

  return (
    <div data-test-subj="createDatasetNdjsonAdvancedSettings">
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsDatetimeFormatLabel}
            infoText={createDatasetWizardStrings.settingsDatetimeFormatNdjsonAdvancedDescription}
          />
        }
        helpText={createDatasetWizardStrings.settingsDatetimeFormatHelp}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsDatetimeFormat"
          fullWidth
          value={datetimeFormatField.value}
          onChange={(e) => datetimeFormatField.onChange(e.target.value)}
          name={datetimeFormatField.name}
          inputRef={datetimeFormatField.ref}
        />
      </EuiFormRow>
    </div>
  );
}
