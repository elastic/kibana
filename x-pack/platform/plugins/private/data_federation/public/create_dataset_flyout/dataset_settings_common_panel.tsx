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
import { DatasetSettingsField } from './dataset_settings_field';

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

  if (!isCsvOrTsv && !showDatetimeFormat) {
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
        <EuiTitle size="xxs">
          <h4>{panelTitle}</h4>
        </EuiTitle>
        <EuiSpacer size="m" />

        {isCsvOrTsv ? (
          <DatasetSettingsField
            control={control}
            fieldId="delimiter"
            testSubjPrefix={testSubjPrefix}
          />
        ) : null}

        {showDatetimeFormat ? (
          <DatasetSettingsField
            control={control}
            fieldId="datetime_format"
            testSubjPrefix={testSubjPrefix}
          />
        ) : null}
      </EuiPanel>
    </>
  );
};
