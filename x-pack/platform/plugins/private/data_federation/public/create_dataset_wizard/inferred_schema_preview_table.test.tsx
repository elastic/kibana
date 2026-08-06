/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import { applySettingsForFormat } from '../create_dataset_flyout/dataset_settings_defaults';
import { emptyCreateDatasetSettingsFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { InferredSchemaPreviewTable } from './inferred_schema_preview_table';
import { getTestConfigurationPreviewFields } from './test_configuration_preview_utils';
import { emptyDatasetWizardFormValues, type DatasetWizardFormValues } from './dataset_wizard_form_state';

const TestHarness = ({
  defaultValues = emptyDatasetWizardFormValues(),
}: {
  defaultValues?: DatasetWizardFormValues;
}) => {
  const { control, watch } = useForm<DatasetWizardFormValues>({
    defaultValues,
  });
  const inferredFields = getTestConfigurationPreviewFields({
    ...defaultValues,
    schema_mapping_mode: 'automatic',
  });

  return (
    <>
      <InferredSchemaPreviewTable
        control={control}
        inferredFields={inferredFields}
        testSubjPrefix="datasetWizardAutomaticSchemaSample"
      />
      <span data-test-subj="automaticFieldTypesValue">
        {JSON.stringify(watch('automatic_field_types'))}
      </span>
    </>
  );
};

describe('InferredSchemaPreviewTable', () => {
  it('renders inferred field names with editable type selects', () => {
    render(
      <EuiProvider>
        <TestHarness
          defaultValues={{
            ...emptyDatasetWizardFormValues(),
            settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
          }}
        />
      </EuiProvider>
    );

    expect(screen.getByTestId('datasetWizardAutomaticSchemaSampleTable')).toBeInTheDocument();
    expect(screen.getByTestId('datasetWizardAutomaticSchemaSampleTableScroll')).toBeInTheDocument();
    expect(screen.getByText('@timestamp')).toBeInTheDocument();
    expect(
      screen.getByTestId('datasetWizardAutomaticSchemaSampleTypeSelect-@timestamp')
    ).toHaveTextContent('date(auto-detected)');
    expect(
      screen.queryByTestId('datasetWizardAutomaticSchemaSampleResetTypeButton-@timestamp')
    ).toBeNull();
  });

  it('shows a reset button for overridden types and restores the auto-detected value', () => {
    render(
      <EuiProvider>
        <TestHarness
          defaultValues={{
            ...emptyDatasetWizardFormValues(),
            settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
            automatic_field_types: {
              '@timestamp': 'keyword',
            },
          }}
        />
      </EuiProvider>
    );

    const resetButton = screen.getByTestId(
      'datasetWizardAutomaticSchemaSampleResetTypeButton-@timestamp'
    );
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);

    expect(screen.getByTestId('automaticFieldTypesValue')).toHaveTextContent('{}');
    expect(
      screen.getByTestId('datasetWizardAutomaticSchemaSampleTypeSelect-@timestamp')
    ).toHaveTextContent('date(auto-detected)');
  });
});
