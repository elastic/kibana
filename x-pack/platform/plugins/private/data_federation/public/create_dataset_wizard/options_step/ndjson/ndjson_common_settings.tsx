/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';

import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import type { CreateDatasetFormValues } from '../../create_dataset_form_state';
import { DatetimeFormatSelect } from '../../components/fields/datetime_format_select';
import { FormRowLabelWithInfo } from '../../components/form_row_label_with_info';

export function NdjsonCommonSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  return (
    <div data-test-subj="createDatasetNdjsonCommonSettings">
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsDatetimeFormatLabel}
            infoText={createDatasetWizardStrings.settingsDatetimeFormatNdjsonDescription}
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsDatetimeFormatNdjsonHelpText"
            defaultMessage="If left blank, defaults to {defaultValue} (an ISO 8601 format)."
            values={{ defaultValue: <EuiCode>strict_date_optional_time</EuiCode> }}
          />
        }
        fullWidth
      >
        <DatetimeFormatSelect control={control} />
      </EuiFormRow>
    </div>
  );
}
