/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import { SchemaSamplePreviewTable } from './schema_sample_preview_table';
import { getTestConfigurationPreviewFields } from './test_configuration_preview_utils';

export interface TestConfigurationPreviewContentProps {
  values: DatasetWizardFormValues;
  isLoading?: boolean;
  testSubjPrefix?: string;
  maxVisibleRows?: number;
}

export const TestConfigurationPreviewContent: FunctionComponent<
  TestConfigurationPreviewContentProps
> = ({
  values,
  isLoading = false,
  testSubjPrefix = 'datasetWizardTestConfiguration',
  maxVisibleRows,
}) => {
  const fields = useMemo(() => getTestConfigurationPreviewFields(values), [values]);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" data-test-subj="datasetWizardTestConfigurationLoading" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <SchemaSamplePreviewTable
      fields={fields}
      testSubjPrefix={testSubjPrefix}
      maxVisibleRows={maxVisibleRows}
    />
  );
};
