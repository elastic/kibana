/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { type CreateDatasetFormValues } from '../create_dataset_form_state';
import { DatetimeFormatSelect } from './datetime_format_select';
import { FormRowLabelWithInfo } from './form_row_label_with_info';

export function NdjsonAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
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
        <DatetimeFormatSelect control={control} />
      </EuiFormRow>
    </div>
  );
}
