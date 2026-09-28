/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import type { ToastsStart } from '@kbn/core/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataSourcesClient } from '../data_sources_client';
import type { DatasetsClient } from '../datasets_client';
import type { DataSource, S3DataSourceWithSecrets } from '../../common/datasource_types';
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

const federatedS3DataSource: S3DataSourceWithSecrets = {
  type: 's3',
  name: 'federated-ds',
  description: '',
  settings: {
    region: 'us-east-1',
    auth: 'federated_identity',
    role_arn: 'arn:aws:iam::123456789012:role/elastic-s3-read',
    jwt_audience: 'custom-audience',
    role_session_name: 'custom-session',
    sts_endpoint: 'https://sts.eu-west-1.amazonaws.com',
    sts_region: 'eu-west-1',
  },
};

const renderFederatedS3EditFlyout = (onSave: jest.Mock) => {
  const services: DataFederationKibanaServices = {
    dataSourcesClient: createClientMock(),
    datasetsClient: createDatasetsClientMock(),
    toasts: createToastsMock(),
    docLinks: createDocLinksMock(),
    featureFlags: { enableFederatedIdentityAuth: true },
    cloudInfo: {
      jwtIssuer: 'https://issuer.example.com',
      deploymentId: 'deployment:abc123',
      isServerless: false,
    },
  };

  return render(
    <EuiProvider>
      <KibanaContextProvider services={services}>
        <CreateDataSourceFlyout
          onClose={jest.fn()}
          onSave={onSave}
          existingDataSourceNames={[]}
          initialDataSource={federatedS3DataSource}
        />
      </KibanaContextProvider>
    </EuiProvider>
  );
};

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

    const { getByTestId, queryByText } = render(
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <CreateDataSourceFlyout
            onClose={jest.fn()}
            onSave={onSave}
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

  describe('form submitter', () => {
    class TestSubmitEvent extends Event {
      readonly submitter: HTMLElement | null;

      constructor(type: string, init: EventInit & { submitter?: HTMLElement | null }) {
        super(type, init);
        this.submitter = init.submitter ?? null;
      }
    }

    const submitFrom = async (form: HTMLElement, submitter: HTMLElement) => {
      await act(async () => {
        form.dispatchEvent(
          new TestSubmitEvent('submit', { bubbles: true, cancelable: true, submitter })
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };

    beforeEach(() => {
      Object.defineProperty(window, 'SubmitEvent', {
        value: TestSubmitEvent,
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(window, 'SubmitEvent');
    });

    it('does not save when submitted by a button without a submit type', async () => {
      const onSave = jest.fn().mockResolvedValue(null);
      const { getByTestId } = renderFederatedS3EditFlyout(onSave);

      const setupSteps = getByTestId('createDataSourceFlyoutS3FederatedManualSteps');
      const annotationLikeButton = document.createElement('button');
      setupSteps.appendChild(annotationLikeButton);

      const form = getByTestId('editDataSourceFlyout').querySelector('form');
      expect(form).not.toBeNull();
      if (!form) return;

      await submitFrom(form, annotationLikeButton);

      expect(onSave).not.toHaveBeenCalled();
    });

    it('saves when submitted by the submit button', async () => {
      const onSave = jest.fn().mockResolvedValue(null);
      const { getByTestId } = renderFederatedS3EditFlyout(onSave);

      const form = getByTestId('editDataSourceFlyout').querySelector('form');
      expect(form).not.toBeNull();
      if (!form) return;

      await submitFrom(form, getByTestId('createDataSourceFlyoutSubmit'));

      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  it('preserves S3 federated identity settings that are not editable in the UI on edit', async () => {
    const onSave = jest.fn().mockResolvedValue(null);
    const { getByTestId } = renderFederatedS3EditFlyout(onSave);

    fireEvent.click(getByTestId('createDataSourceFlyoutSubmit'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(onSave.mock.calls[0][0].settings).toEqual(
      expect.objectContaining({
        role_arn: 'arn:aws:iam::123456789012:role/elastic-s3-read',
        jwt_audience: 'custom-audience',
        role_session_name: 'custom-session',
        sts_endpoint: 'https://sts.eu-west-1.amazonaws.com',
        sts_region: 'eu-west-1',
        auth: 'federated_identity',
      })
    );
  });
});
