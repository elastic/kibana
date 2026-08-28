/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import { DATASET_WIZARD_FLOW_VARIANT_4 } from '../dataset_wizard_flow_variant';
import { LogisticsStep } from './logistics_step';

const TestHarness = ({ name = '' }: { name?: string }) => {
  const { control, setValue } = useForm<DatasetWizardFormValues>({
    defaultValues: { ...emptyDatasetWizardFormValues(), name },
  });

  return (
    <EuiProvider>
      <LogisticsStep
        control={control}
        dataSources={[]}
        onConnectNewDataSource={jest.fn()}
        validateName={() => true}
        setValue={setValue}
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_4}
        syncRegionFromResource={jest.fn()}
      />
    </EuiProvider>
  );
};

const typeUri = (input: HTMLElement, uri: string) => {
  fireEvent.change(input, { target: { value: uri } });
};

describe('FileStep', () => {
  it('renders the File step without a data source or region field', () => {
    const { getByTestId, queryByTestId, getByText } = render(<TestHarness />);

    expect(getByTestId('datasetWizardFileStep')).toBeInTheDocument();
    expect(getByText('File')).toBeInTheDocument();
    expect(getByTestId('datasetWizardResource')).toBeInTheDocument();
    expect(getByTestId('datasetWizardName')).toBeInTheDocument();
    expect(getByTestId('datasetWizardDescription')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardDataSource')).toBeNull();
    expect(queryByTestId('datasetWizardRegion')).toBeNull();
  });

  it('hides the detected details until the URI can be parsed', () => {
    const { getByTestId, queryByTestId } = render(<TestHarness />);

    expect(queryByTestId('datasetWizardFileDetectedDetails')).toBeNull();

    typeUri(getByTestId('datasetWizardResource'), 'acme-logs/vpcflow');

    expect(queryByTestId('datasetWizardFileDetectedDetails')).toBeNull();
  });

  it('shows the parsed type, bucket, prefix, and format hint', async () => {
    const { getByTestId } = render(<TestHarness />);

    typeUri(getByTestId('datasetWizardResource'), 's3://acme-logs/vpcflow/**/*.parquet');

    await waitFor(() => {
      const details = getByTestId('datasetWizardFileDetectedDetails');
      expect(details).toHaveTextContent('Amazon S3');
      expect(details).toHaveTextContent('acme-logs');
      expect(details).toHaveTextContent('vpcflow/');
      expect(details).toHaveTextContent('Parquet');
    });
  });

  it('shows Not detected for values that cannot be parsed', async () => {
    const { getByTestId } = render(<TestHarness />);

    typeUri(getByTestId('datasetWizardResource'), 's3://acme-logs/**');

    await waitFor(() => {
      expect(getByTestId('datasetWizardFileDetectedDetails')).toHaveTextContent('Not detected');
    });
  });

  it('pre-fills the dataset name from the URI and shows the ES|QL hint', async () => {
    const { getByTestId, getByText } = render(<TestHarness />);

    typeUri(getByTestId('datasetWizardResource'), 's3://acme-logs/vpcflow/**/*.parquet');

    await waitFor(() => {
      expect(getByTestId('datasetWizardName')).toHaveValue('acme_vpcflow');
      expect(getByText('Used in ES|QL queries as FROM acme_vpcflow')).toBeInTheDocument();
    });
  });

  it('stops pre-filling the name once the user edits it', async () => {
    const { getByTestId } = render(<TestHarness />);

    typeUri(getByTestId('datasetWizardResource'), 's3://acme-logs/vpcflow/**/*.parquet');

    await waitFor(() => {
      expect(getByTestId('datasetWizardName')).toHaveValue('acme_vpcflow');
    });

    fireEvent.change(getByTestId('datasetWizardName'), { target: { value: 'my-dataset' } });
    typeUri(getByTestId('datasetWizardResource'), 's3://other-bucket/audit/**/*.csv');

    await waitFor(() => {
      expect(getByTestId('datasetWizardFileDetectedDetails')).toHaveTextContent('other-bucket');
    });

    expect(getByTestId('datasetWizardName')).toHaveValue('my-dataset');
  });

  it('does not overwrite a name that already exists', async () => {
    const { getByTestId } = render(<TestHarness name="existing-dataset" />);

    typeUri(getByTestId('datasetWizardResource'), 's3://acme-logs/vpcflow/**/*.parquet');

    await waitFor(() => {
      expect(getByTestId('datasetWizardFileDetectedDetails')).toHaveTextContent('acme-logs');
    });

    expect(getByTestId('datasetWizardName')).toHaveValue('existing-dataset');
  });
});
