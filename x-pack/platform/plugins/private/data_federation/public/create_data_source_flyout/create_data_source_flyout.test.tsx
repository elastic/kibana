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
import { authenticationStrings } from './create_data_source_flyout_authentication_i18n';
import type { DataFederationKibanaServices } from '../types';
import { UI_COUNTER_EVENTS } from '../ui_counters';

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
        datasetSettings: 'https://example.com/data-federation-dataset-settings',
        datasetMappings: 'https://example.com/data-federation-schema#declare-a-schema-explicitly',
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
    featureFlags: {},
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

const renderCreateFlyout = (cloudInfo?: DataFederationKibanaServices['cloudInfo']) => {
  const services: DataFederationKibanaServices = {
    dataSourcesClient: createClientMock(),
    datasetsClient: createDatasetsClientMock(),
    toasts: createToastsMock(),
    docLinks: createDocLinksMock(),
    featureFlags: {},
    cloudInfo,
  };

  return render(
    <EuiProvider>
      <KibanaContextProvider services={services}>
        <CreateDataSourceFlyout
          onClose={jest.fn()}
          onSave={jest.fn().mockResolvedValue(null)}
          existingDataSourceNames={[]}
        />
      </KibanaContextProvider>
    </EuiProvider>
  );
};

describe('CreateDataSourceFlyout', () => {
  describe('datasource_create_form_opened ui counter', () => {
    const renderFlyout = (initialDataSource?: DataSource) => {
      const reportUiCounter = jest.fn();
      const services: DataFederationKibanaServices = {
        dataSourcesClient: createClientMock(),
        datasetsClient: createDatasetsClientMock(),
        toasts: createToastsMock(),
        docLinks: createDocLinksMock(),
        featureFlags: {},
        reportUiCounter,
      };
      const view = render(
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <CreateDataSourceFlyout
              onClose={jest.fn()}
              onSave={jest.fn()}
              existingDataSourceNames={[]}
              initialDataSource={initialDataSource}
            />
          </KibanaContextProvider>
        </EuiProvider>
      );
      return { ...view, reportUiCounter };
    };

    it('reports once when opened in create mode', () => {
      const { reportUiCounter } = renderFlyout();

      expect(reportUiCounter).toHaveBeenCalledTimes(1);
      expect(reportUiCounter).toHaveBeenCalledWith(UI_COUNTER_EVENTS.datasourceCreateFormOpened);
    });

    it('does not report when opened in edit mode', () => {
      const existingDataSource: DataSource = {
        name: 'existing-ds',
        type: 's3',
        description: '',
        settings: { region: 'us-east-1' },
      };
      const { reportUiCounter } = renderFlyout(existingDataSource);

      expect(reportUiCounter).not.toHaveBeenCalled();
    });
  });

  describe('in create mode', () => {
    it('offers and selects federated identity when an issuer is present', async () => {
      const { getByTestId, queryByTestId, findAllByRole, getByRole } = renderCreateFlyout({
        jwtIssuer: 'https://issuer.example.com',
        deploymentId: 'deployment:abc123',
        isServerless: false,
      });

      expect(
        getByTestId('createDataSourceFlyoutAuthenticationLearnMore-federated_identity')
      ).toBeInTheDocument();
      expect(getByTestId('createDataSourceFlyoutS3FederatedRoleArn')).toBeInTheDocument();
      expect(queryByTestId('createDataSourceFlyoutS3AccessKey')).not.toBeInTheDocument();

      fireEvent.click(getByTestId('createDataSourceFlyoutAuthentication'));

      expect(await findAllByRole('option')).toHaveLength(3);
      expect(
        getByRole('option', {
          name: new RegExp(authenticationStrings.federatedIdentityLabel),
          selected: true,
        })
      ).toBeInTheDocument();
    });

    it('hides federated identity when no issuer is present', async () => {
      const { getByTestId, queryByTestId, findAllByRole, queryByRole } = renderCreateFlyout();

      expect(
        getByTestId('createDataSourceFlyoutAuthenticationLearnMore-access_and_secret_keys')
      ).toBeInTheDocument();
      expect(getByTestId('createDataSourceFlyoutS3AccessKey')).toBeInTheDocument();
      expect(queryByTestId('createDataSourceFlyoutS3FederatedRoleArn')).not.toBeInTheDocument();

      fireEvent.click(getByTestId('createDataSourceFlyoutAuthentication'));

      expect(await findAllByRole('option')).toHaveLength(2);
      expect(
        queryByRole('option', { name: new RegExp(authenticationStrings.federatedIdentityLabel) })
      ).not.toBeInTheDocument();
    });
  });

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

  it('does not show the S3 region field', async () => {
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

    const { getByTestId, queryByTestId, findByText, queryByText } = render(
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

    expect(queryByTestId('createDataSourceFlyoutS3Region')).not.toBeInTheDocument();
    expect(
      queryByText(
        'Unique name for use in datasets. All lowercase, dash, underscore, and numbers are supported.'
      )
    ).toBeInTheDocument();
    expect(queryByText('Description (optional)')).toBeInTheDocument();
    expect(queryByText('A brief description to identify this data source.')).toBeInTheDocument();
    expect(queryByTestId('createDataSourceFlyoutConnectionSettingsToggle')).not.toBeInTheDocument();

    fireEvent.change(getByTestId('createDataSourceFlyoutName'), { target: { value: 'my-ds' } });
    fireEvent.click(getByTestId('createDataSourceFlyoutAuthentication'));
    fireEvent.click(await findByText(authenticationStrings.anonymousLabel));
    fireEvent.click(getByTestId('createDataSourceFlyoutSubmit'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(queryByText('Region is required.')).not.toBeInTheDocument();
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

  it('creates an S3 data source with anonymous auth when no settings fields are registered', async () => {
    const services: DataFederationKibanaServices = {
      dataSourcesClient: createClientMock(),
      datasetsClient: createDatasetsClientMock(),
      toasts: createToastsMock(),
      docLinks: createDocLinksMock(),
      featureFlags: {},
    };
    const onSave = jest.fn().mockResolvedValue(null);

    const { getByTestId, findByText } = render(
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

    fireEvent.change(getByTestId('createDataSourceFlyoutName'), {
      target: { value: 'public-bucket' },
    });
    fireEvent.click(getByTestId('createDataSourceFlyoutAuthentication'));
    fireEvent.click(await findByText(authenticationStrings.anonymousLabel));
    fireEvent.click(getByTestId('createDataSourceFlyoutSubmit'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const saved = onSave.mock.calls[0][0] as S3DataSourceWithSecrets;
    expect(saved).toEqual(
      expect.objectContaining({
        type: 's3',
        name: 'public-bucket',
        settings: { auth: 'anonymous' },
      })
    );
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
