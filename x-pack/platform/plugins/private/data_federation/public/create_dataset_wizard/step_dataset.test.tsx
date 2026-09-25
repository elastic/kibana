/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, render, waitFor } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { emptyDatasetFormValues } from './dataset_form_initial_values';
import { StepDataset } from './step_dataset';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';

jest.mock('@kbn/es-ui-shared-plugin/public', () => ({
  Forms: {
    useContent: () => ({
      updateContent: jest.fn(),
    }),
  },
}));

// Avoid pulling in `DataSourceSelect` (which requires Kibana services) for these tests.
jest.mock('./create_dataset_details_fields', () => ({
  CreateDatasetDetailsFields: () => null,
}));

const renderStep = () => {
  let methods: UseFormReturn<CreateDatasetFormValues> | undefined;

  const Wrapper = () => {
    const formMethods = useForm<CreateDatasetFormValues>({
      defaultValues: emptyDatasetFormValues(),
    });
    const format = useWatch({ control: formMethods.control, name: 'settings.format' });

    // Expose the hook-form methods to the test without breaking the rules of hooks.
    const [hasCaptured, setHasCaptured] = useState(false);
    useEffect(() => {
      if (!hasCaptured) {
        methods = formMethods;
        setHasCaptured(true);
      }
    }, [formMethods, hasCaptured]);

    return (
      <EuiProvider>
        <FormProvider {...formMethods}>
          <StepDataset
            dataSources={[]}
            existingDataSetNames={[]}
            loadDataSources={async () => undefined}
          />
          <div data-test-subj="formatValue">{format}</div>
        </FormProvider>
      </EuiProvider>
    );
  };

  const rtl = render(<Wrapper />);
  const getFormat = () => rtl.getByTestId('formatValue').textContent ?? '';

  return {
    ...rtl,
    getFormat,
    getMethods: () => {
      if (!methods) {
        throw new Error('Form methods not captured yet');
      }
      return methods;
    },
  };
};

describe('StepDataset', () => {
  it('auto-selects format based on file extension in resource', async () => {
    const { getMethods, getFormat, getByTestId } = renderStep();

    expect(getFormat()).toBe('');

    act(() => {
      getMethods().setValue('resource', 's3://my-bucket/access/2026-01-01/*.parquet');
    });

    await waitFor(() => expect(getFormat()).toBe('parquet'));
    await waitFor(() =>
      expect(getByTestId('createDatasetSettingsFormat')).toHaveTextContent(
        createDatasetWizardStrings.autoDetectedSuffix
      )
    );
  });

  it('keeps auto-selected format in sync while user has not manually overridden it', async () => {
    const { getMethods, getFormat } = renderStep();

    act(() => {
      getMethods().setValue('resource', 's3://bucket/logs/*.csv.gz');
    });
    await waitFor(() => expect(getFormat()).toBe('csv'));

    act(() => {
      getMethods().setValue('resource', 's3://bucket/logs/*.tsv');
    });
    await waitFor(() => expect(getFormat()).toBe('tsv'));
  });

  it('does not override a user-selected format after manual change', async () => {
    const { getMethods, getFormat } = renderStep();

    act(() => {
      getMethods().setValue('resource', 's3://bucket/logs/*.csv');
    });
    await waitFor(() => expect(getFormat()).toBe('csv'));

    act(() => {
      // Simulate user picking a different format manually.
      getMethods().setValue('settings.format', 'parquet');
    });
    await waitFor(() => expect(getFormat()).toBe('parquet'));

    act(() => {
      getMethods().setValue('resource', 's3://bucket/logs/*.tsv');
    });

    // Should remain on the manually selected value.
    await waitFor(() => expect(getFormat()).toBe('parquet'));
  });
});
