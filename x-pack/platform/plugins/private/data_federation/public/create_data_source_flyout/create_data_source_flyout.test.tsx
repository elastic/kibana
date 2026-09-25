/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { ToastsStart } from '@kbn/core/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataSourcesClient } from '../data_sources_client';
import type { DatasetsClient } from '../datasets_client';
import type { DataSource } from '../../common/datasource_types';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import type { DataFederationKibanaServices } from '../types';

const createToastsMock = (): ToastsStart =>
  ({
    addSuccess: jest.fn(),
    addDanger: jest.fn(),
  } as unknown as ToastsStart);

const createClientMock = (): DataSourcesClient =>
  ({
    add: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as DataSourcesClient);

const createDatasetsClientMock = (): DatasetsClient =>
  ({
    add: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as DatasetsClient);

const createDocLinksMock = (): DocLinksStart =>
  ({
    links: {
      dataFederation: {
        overview: 'https://example.com/data-federation',
        quickstart: 'https://example.com/data-federation-quickstart',
        dataSources: 'https://example.com/data-federation-sources',
        datasets: 'https://example.com/data-federation-datasets',
        datasetSettings: 'https://example.com/data-federation-datasets#dataset-settings',
        authentication: 'https://example.com/data-federation-sources#authentication',
        staticCredentials: 'https://example.com/data-federation-static-credentials',
        federatedIdentity: 'https://example.com/data-federation-federated-identity',
        querying: 'https://example.com/data-federation-querying',
        security: 'https://example.com/data-federation-security',
      },
    },
  } as unknown as DocLinksStart);

describe('CreateDataSourceFlyout', () => {
  it('renders core actions and disables save while saving', async () => {
    const toasts = createToastsMock();
    const client = createClientMock();
    const services: DataFederationKibanaServices = {
      dataSourcesClient: client,
      datasetsClient: createDatasetsClientMock(),
      toasts,
      docLinks: createDocLinksMock(),
      featureFlags: {},
    };
    let resolveSave: (value: string | null) => void;
    const savePromise = new Promise<string | null>((resolve) => {
      resolveSave = resolve;
    });
    const onSave = jest.fn().mockReturnValue(savePromise);
    const onTestConnection = jest.fn().mockResolvedValue({ status: 'success' });

    const initialDataSource: DataSource = {
      type: 's3',
      name: 'ds',
      description: '',
      settings: {
        region: '',
        endpoint: '',
        access_key: '',
        secret_key: '',
      } as any,
    } as any;

    const { getByTestId } = render(
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <CreateDataSourceFlyout
            onClose={jest.fn()}
            onSave={onSave}
            onTestConnection={onTestConnection}
            existingDataSourceNames={[]}
            initialDataSource={initialDataSource}
          />
        </KibanaContextProvider>
      </EuiProvider>
    );

    expect(getByTestId('createDataSourceFlyoutSubmit')).toBeInTheDocument();

    fireEvent.click(getByTestId('createDataSourceFlyoutSubmit'));

    await waitFor(() => {
      expect(getByTestId('createDataSourceFlyoutSubmit')).toBeDisabled();
    });

    resolveSave!(null);
    await waitFor(() => {
      expect(getByTestId('createDataSourceFlyoutSubmit')).not.toBeDisabled();
    });
  });

  it('shows the S3 region field without expanding connection settings, and requires it on create', async () => {
    const toasts = createToastsMock();
    const client = createClientMock();
    const services: DataFederationKibanaServices = {
      dataSourcesClient: client,
      datasetsClient: createDatasetsClientMock(),
      toasts,
      docLinks: createDocLinksMock(),
      featureFlags: {},
    };
    const onSave = jest.fn().mockResolvedValue(null);
    const onTestConnection = jest.fn().mockResolvedValue({ status: 'success' });

    const { getByTestId, queryByText } = render(
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <CreateDataSourceFlyout
            onClose={jest.fn()}
            onSave={onSave}
            onTestConnection={onTestConnection}
            existingDataSourceNames={[]}
          />
        </KibanaContextProvider>
      </EuiProvider>
    );

    // Region is visible up front, without expanding "Show connection settings".
    expect(getByTestId('createDataSourceFlyoutS3Region')).toBeInTheDocument();

    fireEvent.change(getByTestId('createDataSourceFlyoutName'), { target: { value: 'my-ds' } });
    fireEvent.click(getByTestId('createDataSourceFlyoutSubmit'));

    await waitFor(() => {
      expect(queryByText('Region is required.')).toBeInTheDocument();
    });
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(getByTestId('createDataSourceFlyoutS3Region'), {
      target: { value: 'us-east-1' },
    });

    await waitFor(() => {
      expect(queryByText('Region is required.')).not.toBeInTheDocument();
    });
  });

  it('shows an error', async () => {
    const services: DataFederationKibanaServices = {
      dataSourcesClient: createClientMock(),
      datasetsClient: createDatasetsClientMock(),
      toasts: createToastsMock(),
      docLinks: createDocLinksMock(),
      featureFlags: {},
    };
    const onSave = jest.fn().mockResolvedValue('validation_exception: something went wrong');
    const onTestConnection = jest.fn().mockResolvedValue({ status: 'success' });

    const initialDataSource: DataSource = {
      type: 's3',
      name: 'ds',
      description: '',
      settings: {
        region: 'us-east-1',
      } as any,
    } as any;

    const { findByTestId } = render(
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <CreateDataSourceFlyout
            onClose={jest.fn()}
            onSave={onSave}
            onTestConnection={onTestConnection}
            existingDataSourceNames={[]}
            initialDataSource={initialDataSource}
          />
        </KibanaContextProvider>
      </EuiProvider>
    );

    fireEvent.click(await findByTestId('createDataSourceFlyoutSubmit'));

    const banner = await findByTestId('createDataSourceFlyoutSaveError');
    expect(banner).toHaveTextContent('Could not save the data source');
    expect(banner).toHaveTextContent('validation_exception: something went wrong');
    expect(await findByTestId('createDataSourceFlyoutFooter')).toContainElement(banner);
  });

  describe('test connection', () => {
    const editedDataSource: DataSource = {
      type: 's3',
      name: 'ds',
      description: '',
      settings: {
        region: 'us-east-1',
      } as any,
    } as any;

    const renderFlyout = (onTestConnection: jest.Mock, mode: 'create' | 'edit' = 'edit') => {
      const services: DataFederationKibanaServices = {
        dataSourcesClient: createClientMock(),
        datasetsClient: createDatasetsClientMock(),
        toasts: createToastsMock(),
        docLinks: createDocLinksMock(),
        featureFlags: {},
      };

      return render(
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <CreateDataSourceFlyout
              onClose={jest.fn()}
              onSave={jest.fn().mockResolvedValue(null)}
              onTestConnection={onTestConnection}
              existingDataSourceNames={[]}
              initialDataSource={mode === 'edit' ? editedDataSource : undefined}
            />
          </KibanaContextProvider>
        </EuiProvider>
      );
    };

    it('reports a successful connection', async () => {
      const onTestConnection = jest.fn().mockResolvedValue({ status: 'success' });
      const { findByTestId } = renderFlyout(onTestConnection);

      fireEvent.click(await findByTestId('createDataSourceFlyoutTestConnection'));

      const callout = await findByTestId('createDataSourceFlyoutTestConnectionSuccess');
      expect(callout).toHaveTextContent('Connection successful');
      expect(onTestConnection).toHaveBeenCalledWith(
        expect.objectContaining({ type: 's3', name: 'ds' })
      );
    });

    it('shows the failure reason returned by Elasticsearch', async () => {
      const onTestConnection = jest
        .fn()
        .mockResolvedValue({ status: 'failure', error: 'The AWS Access Key Id does not exist.' });
      const { findByTestId } = renderFlyout(onTestConnection);

      fireEvent.click(await findByTestId('createDataSourceFlyoutTestConnection'));

      const callout = await findByTestId('createDataSourceFlyoutTestConnectionFailure');
      expect(callout).toHaveTextContent('Connection failed');
      expect(callout).toHaveTextContent('The AWS Access Key Id does not exist.');
    });

    it('reports a request error apart from a failed connection', async () => {
      const onTestConnection = jest.fn().mockRejectedValue(new Error('Request timed out'));
      const { findByTestId, queryByTestId } = renderFlyout(onTestConnection);

      fireEvent.click(await findByTestId('createDataSourceFlyoutTestConnection'));

      const callout = await findByTestId('createDataSourceFlyoutTestConnectionError');
      expect(callout).toHaveTextContent('Could not run the connection test');
      expect(callout).toHaveTextContent('Request timed out');
      expect(queryByTestId('createDataSourceFlyoutTestConnectionFailure')).not.toBeInTheDocument();
    });

    it('ignores the result of a test the configuration changed under', async () => {
      let resolveTest: (result: { status: string }) => void;
      const onTestConnection = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveTest = resolve;
        })
      );
      const { findByTestId, getByTestId, queryByTestId } = renderFlyout(onTestConnection);

      fireEvent.click(await findByTestId('createDataSourceFlyoutTestConnection'));
      await waitFor(() => expect(onTestConnection).toHaveBeenCalled());

      fireEvent.change(getByTestId('createDataSourceFlyoutS3Region'), {
        target: { value: 'eu-west-1' },
      });
      resolveTest!({ status: 'success' });

      await waitFor(() => {
        expect(getByTestId('createDataSourceFlyoutSubmit')).not.toBeDisabled();
      });
      expect(queryByTestId('createDataSourceFlyoutTestConnectionSuccess')).not.toBeInTheDocument();
    });

    it('falls back to the untestable callout for an unknown status', async () => {
      const onTestConnection = jest.fn().mockResolvedValue({ status: 'something_new' });
      const { findByTestId } = renderFlyout(onTestConnection);

      fireEvent.click(await findByTestId('createDataSourceFlyoutTestConnection'));

      expect(
        await findByTestId('createDataSourceFlyoutTestConnectionUntestable')
      ).toHaveTextContent('Connection could not be verified');
    });

    it('shows an untestable result as a warning', async () => {
      const onTestConnection = jest.fn().mockResolvedValue({
        status: 'untestable',
        message: 'Create a dataset to validate access.',
      });
      const { findByTestId } = renderFlyout(onTestConnection);

      fireEvent.click(await findByTestId('createDataSourceFlyoutTestConnection'));

      const callout = await findByTestId('createDataSourceFlyoutTestConnectionUntestable');
      expect(callout).toHaveTextContent('Connection could not be verified');
      expect(callout).toHaveTextContent('Create a dataset to validate access.');
    });

    it('discards the result when the configuration changes', async () => {
      const onTestConnection = jest.fn().mockResolvedValue({ status: 'success' });
      const { findByTestId, getByTestId, queryByTestId } = renderFlyout(onTestConnection);

      fireEvent.click(await findByTestId('createDataSourceFlyoutTestConnection'));
      await findByTestId('createDataSourceFlyoutTestConnectionSuccess');

      fireEvent.change(getByTestId('createDataSourceFlyoutS3Region'), {
        target: { value: 'eu-west-1' },
      });

      await waitFor(() => {
        expect(
          queryByTestId('createDataSourceFlyoutTestConnectionSuccess')
        ).not.toBeInTheDocument();
      });
    });

    it('discards the result when the authentication method changes', async () => {
      const onTestConnection = jest.fn().mockResolvedValue({ status: 'success' });
      const { findByTestId, queryByTestId } = renderFlyout(onTestConnection);

      fireEvent.click(await findByTestId('createDataSourceFlyoutTestConnection'));
      await findByTestId('createDataSourceFlyoutTestConnectionSuccess');

      // The EuiSuperSelect dropdown renders in a portal, outside the render container.
      // The edited data source has no credentials, so it starts on Anonymous and the first
      // option is a different method.
      fireEvent.click(screen.getByTestId('createDataSourceFlyoutAuthentication'));
      const [firstOption] = await screen.findAllByRole('option');
      fireEvent.click(firstOption);

      await waitFor(() => {
        expect(
          queryByTestId('createDataSourceFlyoutTestConnectionSuccess')
        ).not.toBeInTheDocument();
      });
    });

    it('blocks saving while a test is running', async () => {
      let resolveTest: (result: { status: string }) => void;
      const onTestConnection = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveTest = resolve;
        })
      );
      const { findByTestId, getByTestId } = renderFlyout(onTestConnection);

      fireEvent.click(await findByTestId('createDataSourceFlyoutTestConnection'));

      await waitFor(() => {
        expect(getByTestId('createDataSourceFlyoutSubmit')).toBeDisabled();
      });

      resolveTest!({ status: 'success' });

      await waitFor(() => {
        expect(getByTestId('createDataSourceFlyoutSubmit')).not.toBeDisabled();
      });
    });

    it('does not run the test when the form is invalid', async () => {
      const onTestConnection = jest.fn().mockResolvedValue({ status: 'success' });
      const { findByTestId, queryByText } = renderFlyout(onTestConnection, 'create');

      fireEvent.click(await findByTestId('createDataSourceFlyoutTestConnection'));

      await waitFor(() => {
        expect(queryByText('Name is required.')).toBeInTheDocument();
      });
      expect(onTestConnection).not.toHaveBeenCalled();
    });
  });
});
