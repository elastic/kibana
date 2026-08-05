/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { Control } from 'react-hook-form';

import type { CreateDatasetFormValues, DatasetFormatFormValue } from './create_dataset_flyout_form_state';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';
import { DatasetSettingsFieldsLayout } from './dataset_settings_fields_layout';

export interface DatasetSettingsCommonPanelProps {
  control: Control<CreateDatasetFormValues>;
  format: Exclude<DatasetFormatFormValue, ''>;
  panelTitle: string;
  testSubjPrefix?: string;
}

export const DatasetSettingsCommonPanel: FunctionComponent<DatasetSettingsCommonPanelProps> = ({
  control,
  format,
  panelTitle,
  testSubjPrefix = 'datasetWizard',
}) => {
  const isCsvOrTsv = format === 'csv' || format === 'tsv';
  const showDatetimeFormat = isCsvOrTsv || format === 'ndjson';

  const commonFields: DatasetSettingsFieldId[] = [];

  if (isCsvOrTsv) {
    commonFields.push('delimiter');
  }

  if (showDatetimeFormat) {
    commonFields.push('datetime_format');
  }

  if (commonFields.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel
        color="subdued"
        paddingSize="m"
        hasShadow={false}
        data-test-subj={`${testSubjPrefix}CommonSettingsPanel`}
      >
        <EuiTitle size="xs">
          <h3>{panelTitle}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />

        <DatasetSettingsFieldsLayout
          control={control}
          fields={commonFields}
          testSubjPrefix={testSubjPrefix}
          columns={2}
        />
      </EuiPanel>
    </>
  );
};
