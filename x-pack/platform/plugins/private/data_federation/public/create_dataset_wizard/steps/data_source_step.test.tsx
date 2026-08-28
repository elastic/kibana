/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import type { DataSource } from '../../../common';
import { DataSourceStep, type DataSourceStepHandle } from './data_source_step';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: {} }),
}));

const RESOURCE = 's3://acme-logs/vpcflow/**/*.parquet?region=us-east-1';

const s3Source = (name: string, region?: string): DataSource => ({
  name,
  description: '',
  type: 's3',
  settings: region ? { region } : {},
});

const renderStep = ({
  resource = RESOURCE,
  dataSources = [] as DataSource[],
  selectedDataSource = '',
  onSelectDataSource = jest.fn(),
  onCreateDataSource = jest.fn().mockResolvedValue(null),
  onConnectionTestResultChange = jest.fn(),
} = {}) => {
  const ref = React.createRef<DataSourceStepHandle>();

  const view = render(
    <EuiProvider>
      <DataSourceStep
        ref={ref}
        resource={resource}
        dataSources={dataSources}
        selectedDataSource={selectedDataSource}
        onSelectDataSource={onSelectDataSource}
        onCreateDataSource={onCreateDataSource}
        onConnectionTestResultChange={onConnectionTestResultChange}
      />
    </EuiProvider>
  );

  return { ...view, ref, onSelectDataSource, onCreateDataSource, onConnectionTestResultChange };
};

const runConnectionTest = async (testButton: HTMLElement) => {
  fireEvent.click(testButton);

  await act(async () => {
    jest.advanceTimersByTime(600);
  });
};

const submit = async (ref: React.RefObject<DataSourceStepHandle>) => {
  let result: boolean | undefined;
  await act(async () => {
    result = await ref.current?.submit();
  });

  return result;
};

describe('DataSourceStep', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('selects Create new and pre-fills the connection name when nothing matches', () => {
    const { getByRole, getByTestId } = renderStep();

    expect(getByRole('radio', { name: 'Create new' })).toBeChecked();
    expect(getByTestId('datasetWizardConnectionName')).toHaveValue('acme-logs');
    expect(getByTestId('datasetWizardDataSourceRegionNote')).toHaveTextContent(
      'AWS region us-east-1, detected from the bucket.'
    );
  });

  it('disables Use existing when there is no S3 source to pick', () => {
    const { getByRole } = renderStep();

    expect(getByRole('radio', { name: 'Use existing' })).toBeDisabled();
  });

  it('selects the single matching source without a banner', async () => {
    const { getByRole, queryByTestId, onSelectDataSource } = renderStep({
      dataSources: [s3Source('acme-logs-connection')],
    });

    expect(getByRole('radio', { name: 'Use existing' })).toBeChecked();
    expect(queryByTestId('datasetWizardConnectionName')).toBeNull();

    await waitFor(() => {
      expect(onSelectDataSource).toHaveBeenCalledWith('acme-logs-connection');
    });
  });

  it('falls back to Create new when several sources could match', () => {
    const { getByRole } = renderStep({
      dataSources: [s3Source('one'), s3Source('two')],
    });

    expect(getByRole('radio', { name: 'Create new' })).toBeChecked();
  });

  it('falls back to Create new when the only source is pinned to another region', () => {
    const { getByRole } = renderStep({
      dataSources: [s3Source('west', 'us-west-2')],
    });

    expect(getByRole('radio', { name: 'Create new' })).toBeChecked();
  });

  it('shows a generic region note when the URI has no region', () => {
    const { getByTestId } = renderStep({ resource: 's3://acme-logs/vpcflow/**/*.parquet' });

    expect(getByTestId('datasetWizardDataSourceRegionNote')).toHaveTextContent(
      'The AWS region is detected from the bucket.'
    );
  });

  it('switches fields between the three authentication methods', () => {
    const { getByTestId, queryByTestId } = renderStep();

    expect(getByTestId('createDataSourceFlyoutS3FederatedRoleArn')).toBeInTheDocument();

    fireEvent.click(getByTestId('createDataSourceFlyoutAuthentication-access_and_secret_keys'));

    expect(getByTestId('createDataSourceFlyoutS3AccessKey')).toBeInTheDocument();
    expect(getByTestId('createDataSourceFlyoutS3SecretKey')).toBeInTheDocument();
    expect(queryByTestId('createDataSourceFlyoutS3FederatedRoleArn')).toBeNull();

    fireEvent.click(getByTestId('createDataSourceFlyoutAuthentication-anonymous'));

    expect(queryByTestId('createDataSourceFlyoutS3AccessKey')).toBeNull();
    expect(
      getByTestId('createDataSourceFlyoutAuthenticationAnonymousDescription')
    ).toHaveTextContent('must allow anonymous public read access');
  });

  it('does not create a data source while required fields are missing', async () => {
    const { getByTestId, ref, onCreateDataSource } = renderStep();

    fireEvent.change(getByTestId('datasetWizardConnectionName'), { target: { value: '' } });

    expect(await submit(ref)).toBe(false);
    expect(onCreateDataSource).not.toHaveBeenCalled();
  });

  it('creates the data source with the detected region and switches to Use existing', async () => {
    const { getByRole, getByTestId, ref, onCreateDataSource } = renderStep();

    fireEvent.change(getByTestId('createDataSourceFlyoutS3FederatedRoleArn'), {
      target: { value: 'arn:aws:iam::112233445566:role/elastic-data-federation' },
    });

    expect(await submit(ref)).toBe(true);
    expect(onCreateDataSource).toHaveBeenCalledWith({
      name: 'acme-logs',
      description: '',
      type: 's3',
      settings: {
        role_arn: 'arn:aws:iam::112233445566:role/elastic-data-federation',
        auth: 'federated_identity',
        region: 'us-east-1',
      },
    });
    expect(getByRole('radio', { name: 'Use existing' })).toBeChecked();
  });

  it('stores no credentials for a public bucket', async () => {
    const { getByTestId, ref, onCreateDataSource } = renderStep();

    fireEvent.click(getByTestId('createDataSourceFlyoutAuthentication-anonymous'));

    expect(await submit(ref)).toBe(true);
    expect(onCreateDataSource).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: { auth: 'anonymous', region: 'us-east-1' },
      })
    );
  });

  it('keeps the user on the step and shows the failure inline', async () => {
    const { getByRole, getByTestId, ref } = renderStep({
      onCreateDataSource: jest.fn().mockResolvedValue('Name is already in use.'),
    });

    fireEvent.change(getByTestId('createDataSourceFlyoutS3FederatedRoleArn'), {
      target: { value: 'arn:aws:iam::112233445566:role/elastic-data-federation' },
    });

    expect(await submit(ref)).toBe(false);
    expect(getByTestId('datasetWizardDataSourceCreateError')).toHaveTextContent(
      'Name is already in use.'
    );
    expect(getByRole('radio', { name: 'Create new' })).toBeChecked();
  });

  it('requires a selection before leaving the step in existing mode', async () => {
    const { getByRole, getByText, ref } = renderStep({
      dataSources: [s3Source('acme-logs-connection')],
    });

    expect(getByRole('radio', { name: 'Use existing' })).toBeChecked();
    expect(await submit(ref)).toBe(false);
    expect(getByText('Select a data source to continue.')).toBeInTheDocument();
  });

  it('reports a successful connection test', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    const { getByTestId, onConnectionTestResultChange } = renderStep();

    await runConnectionTest(getByTestId('datasetWizardTestConnection'));

    expect(getByTestId('datasetWizardTestConnectionCallout-success')).toHaveTextContent(
      'Connection successful'
    );
    expect(onConnectionTestResultChange).toHaveBeenLastCalledWith('success');
  });

  it('reports a connection test the user can continue past', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.9);

    const { getByTestId, onConnectionTestResultChange } = renderStep();

    await runConnectionTest(getByTestId('datasetWizardTestConnection'));

    expect(getByTestId('datasetWizardTestConnectionCallout-warning')).toHaveTextContent(
      "We couldn't reach this data source"
    );
    expect(onConnectionTestResultChange).toHaveBeenLastCalledWith('warning');
  });

  it('drops the result once the connection settings change', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    const { getByTestId, queryByTestId, onConnectionTestResultChange } = renderStep();

    await runConnectionTest(getByTestId('datasetWizardTestConnection'));
    expect(getByTestId('datasetWizardTestConnectionCallout-success')).toBeInTheDocument();

    fireEvent.click(getByTestId('createDataSourceFlyoutAuthentication-access_and_secret_keys'));

    expect(queryByTestId('datasetWizardTestConnectionCallout-success')).toBeNull();
    expect(onConnectionTestResultChange).toHaveBeenLastCalledWith(undefined);
  });

  it('cannot test an existing source before one is picked', () => {
    const { getByTestId, rerender } = renderStep({
      dataSources: [s3Source('acme-logs-connection')],
    });

    expect(getByTestId('datasetWizardTestConnection')).toBeDisabled();

    rerender(
      <EuiProvider>
        <DataSourceStep
          dataSources={[s3Source('acme-logs-connection')]}
          resource={RESOURCE}
          selectedDataSource="acme-logs-connection"
          onSelectDataSource={jest.fn()}
          onCreateDataSource={jest.fn()}
          onConnectionTestResultChange={jest.fn()}
        />
      </EuiProvider>
    );

    expect(getByTestId('datasetWizardTestConnection')).toBeEnabled();
  });
});
