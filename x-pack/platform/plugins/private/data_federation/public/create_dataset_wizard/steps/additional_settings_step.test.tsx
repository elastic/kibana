/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import { DATASET_WIZARD_FLOW_VARIANT_2 } from '../dataset_wizard_flow_variant';
import { AdditionalSettingsStep } from './additional_settings_step';

const TestHarness = ({
  resource,
  isEditMode = false,
}: {
  resource: string;
  isEditMode?: boolean;
}) => {
  const syncedResourceRef = useRef<string | null>(null);
  const { control, getValues, setValue } = useForm<DatasetWizardFormValues>({
    defaultValues: emptyDatasetWizardFormValues(),
  });

  return (
    <EuiProvider>
      <AdditionalSettingsStep
        control={control}
        getValues={getValues}
        setValue={setValue}
        resource={resource}
        syncedResourceRef={syncedResourceRef}
        isEditMode={isEditMode}
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_2}
      />
    </EuiProvider>
  );
};

describe('AdditionalSettingsStep', () => {
  it('renders format field and accordions when format is auto-detected', async () => {
    const { getByTestId, getByText } = render(
      <TestHarness resource="s3://bucket/data.csv" />
    );

    expect(getByText('Additional settings (optional)')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSettingsFormat')).toBeInTheDocument();

    await waitFor(() => {
      expect(getByTestId('datasetWizardAccordionStructureAndSchema')).toBeInTheDocument();
      expect(getByTestId('datasetWizardAccordionTextParsing')).toBeInTheDocument();
      expect(getByTestId('datasetWizardCommonSettingsPanel')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsDelimiter')).toBeInTheDocument();
    });
  });

  it('leaves format empty and hides accordions when extension is not recognized', () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness resource="s3://bucket/data.json" />
    );

    expect(getByTestId('datasetWizardSettingsFormat')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardAccordionStructureAndSchema')).toBeNull();
  });

  it('prefills csv defaults when format is auto-detected', async () => {
    const Harness = () => {
      const syncedResourceRef = useRef<string | null>(null);
      const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
        defaultValues: emptyDatasetWizardFormValues(),
      });
      const settings = watch('settings');

      return (
        <EuiProvider>
          <AdditionalSettingsStep
            control={control}
            getValues={getValues}
            setValue={setValue}
            resource="s3://bucket/data.csv"
            syncedResourceRef={syncedResourceRef}
            isEditMode={false}
            flowVariant={DATASET_WIZARD_FLOW_VARIANT_2}
          />
          <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
        </EuiProvider>
      );
    };

    const { getByTestId } = render(<Harness />);

    await waitFor(() => {
      const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
      expect(settings.format).toBe('csv');
      expect(settings.delimiter).toBe(',');
      expect(settings.schema_sample_size).toBe('20000');
    });
  });

  it('hides csv-only accordions for parquet format', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness resource="s3://bucket/data.parquet" />
    );

    await waitFor(() => {
      expect(getByTestId('datasetWizardAccordionStructureAndSchema')).toBeInTheDocument();
    });

    expect(queryByTestId('datasetWizardAccordionTextParsing')).toBeNull();
    expect(queryByTestId('datasetWizardAccordionErrorHandling')).toBeNull();
    expect(queryByTestId('datasetWizardCommonSettingsPanel')).toBeNull();
    expect(getByTestId('datasetWizardAccordionLimitsAndPerformance')).toBeInTheDocument();
  });

  it('shows datetime format in common settings for ndjson without columns accordion', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness resource="s3://bucket/data.ndjson" />
    );

    await waitFor(() => {
      expect(getByTestId('datasetWizardCommonSettingsPanel')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsDatetimeFormat')).toBeInTheDocument();
    });

    expect(queryByTestId('datasetWizardSettingsDelimiter')).toBeNull();
    expect(queryByTestId('datasetWizardAccordionColumnsAndValues')).toBeNull();
  });
});
