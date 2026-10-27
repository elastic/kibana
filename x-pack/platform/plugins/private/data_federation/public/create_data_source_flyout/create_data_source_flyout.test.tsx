/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';

import type { HttpStart, ToastsStart } from '@kbn/core/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DataSourcesClient } from '../data_sources_client';
import { getDataSourceByIdApiPath } from '../../common';
import type { DatasetsClient } from '../datasets_client';
import type { DataSource, S3DataSourceWithSecrets } from '../../common/datasource_types';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { authOptionStrings } from '../service_definitions/auth_options_i18n';
import {
  buildS3CloudFormationLaunchUrl,
  s3FederatedIdentitySetupStrings,
} from './federated_identity_s3_setup_content';
import type { DataFederationKibanaServices } from '../types';
import { createServiceRegistry } from '../service_registry/create_service_registry';
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
    serviceRegistry: createServiceRegistry(),
    toasts: createToastsMock(),
    docLinks: createDocLinksMock(),
    featureFlags: {},
    cloudInfo: {
      jwtIssuer: 'https://issuer.example.com',
      deploymentId: 'deployment:abc123',
      isServerless: false,
      awsCloudFormationTemplateUrl: 'https://cft.s3.amazonaws.com/aws/v1/datasource-cft.yml',
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

const renderCreateFlyout = (
  cloudInfo?: DataFederationKibanaServices['cloudInfo'],
  onSave: jest.Mock = jest.fn().mockResolvedValue(null)
) => {
  const services: DataFederationKibanaServices = {
    dataSourcesClient: createClientMock(),
    datasetsClient: createDatasetsClientMock(),
    toasts: createToastsMock(),
    docLinks: createDocLinksMock(),
    featureFlags: {},
    cloudInfo,
    serviceRegistry: createServiceRegistry(),
  };

  return render(
    <EuiProvider>
      <KibanaContextProvider services={services}>
        <CreateDataSourceFlyout onClose={jest.fn()} onSave={onSave} existingDataSourceNames={[]} />
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
        serviceRegistry: createServiceRegistry(),
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
        awsCloudFormationTemplateUrl: 'https://cft.s3.amazonaws.com/aws/v1/datasource-cft.yml',
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
          name: new RegExp(authOptionStrings.federatedIdentityLabel),
          selected: true,
        })
      ).toBeInTheDocument();
    });

    it('defaults to the CloudFormation setup and switches the role ARN help with the method', () => {
      const cloudInfo = {
        jwtIssuer: 'https://issuer.example.com',
        deploymentId: 'deployment:abc123',
        isServerless: false,
        awsCloudFormationTemplateUrl: 'https://cft.s3.amazonaws.com/aws/v1/datasource-cft.yml',
      };
      const { getByTestId, getByText, queryByTestId } = renderCreateFlyout(cloudInfo);

      expect(getByTestId('createDataSourceFlyoutS3FederatedDeployLaunchButton')).toHaveAttribute(
        'href',
        buildS3CloudFormationLaunchUrl({
          jwtIssuer: cloudInfo.jwtIssuer,
          subject: cloudInfo.deploymentId,
          templateUrl: cloudInfo.awsCloudFormationTemplateUrl,
        })
      );
      expect(getByText(s3FederatedIdentitySetupStrings.deployRoleArnHelp)).toBeInTheDocument();

      fireEvent.click(
        within(getByTestId('createDataSourceFlyoutS3FederatedSetupMethod-manual')).getByRole(
          'radio'
        )
      );

      expect(queryByTestId('createDataSourceFlyoutS3FederatedDeployPanel')).not.toBeInTheDocument();
      expect(getByTestId('createDataSourceFlyoutS3FederatedManualSteps')).toBeInTheDocument();
      expect(getByText(s3FederatedIdentitySetupStrings.roleArnHelp)).toBeInTheDocument();
    });

    describe('role ARN', () => {
      const federatedCloudInfo = {
        jwtIssuer: 'https://issuer.example.com',
        deploymentId: 'deployment:abc123',
        isServerless: false,
        awsCloudFormationTemplateUrl: 'https://cft.s3.amazonaws.com/aws/v1/datasource-cft.yml',
      };

      const submitWithRoleArn = (onSave: jest.Mock, roleArn: string, method?: 'manual') => {
        const utils = renderCreateFlyout(federatedCloudInfo, onSave);

        if (method) {
          fireEvent.click(
            within(
              utils.getByTestId(`createDataSourceFlyoutS3FederatedSetupMethod-${method}`)
            ).getByRole('radio')
          );
        }
        fireEvent.change(utils.getByTestId('createDataSourceFlyoutName'), {
          target: { value: 'federated-bucket' },
        });
        fireEvent.change(utils.getByTestId('createDataSourceFlyoutS3FederatedRoleArn'), {
          target: { value: roleArn },
        });
        fireEvent.click(utils.getByTestId('createDataSourceFlyoutSubmit'));

        return utils;
      };

      // The stack creates more than one role, so a different one is flagged, but still saved in
      // case it is a valid role we did not anticipate.
      it('warns about a role the CloudFormation stack did not create, but still saves it', async () => {
        const onSave = jest.fn().mockResolvedValue(null);
        const { getByTestId } = submitWithRoleArn(
          onSave,
          'arn:aws:iam::123456789012:role/elastic-s3-read'
        );

        expect(getByTestId('createDataSourceFlyoutS3FederatedRoleArnWarning')).toBeInTheDocument();
        await waitFor(() => {
          expect(onSave).toHaveBeenCalledTimes(1);
        });
      });

      it.each([
        'arn:aws:iam::123456789012:role/ElasticEsqlDataFederation-a1b2c3',
        'arn:aws:iam::123456789012:role/elastic/ElasticEsqlDataFederation-a1b2c3',
      ])('does not warn about the role the CloudFormation stack creates: %s', async (roleArn) => {
        const onSave = jest.fn().mockResolvedValue(null);
        const { queryByTestId } = submitWithRoleArn(onSave, roleArn);

        expect(
          queryByTestId('createDataSourceFlyoutS3FederatedRoleArnWarning')
        ).not.toBeInTheDocument();
        await waitFor(() => {
          expect(onSave).toHaveBeenCalledTimes(1);
        });
      });

      // Manual setup lets users name the role, so it only has to be a role ARN.
      it('accepts any role ARN with the manual setup', async () => {
        const onSave = jest.fn().mockResolvedValue(null);
        const { queryByTestId } = submitWithRoleArn(
          onSave,
          'arn:aws:iam::123456789012:role/elastic-s3-read',
          'manual'
        );

        expect(
          queryByTestId('createDataSourceFlyoutS3FederatedRoleArnWarning')
        ).not.toBeInTheDocument();
        await waitFor(() => {
          expect(onSave).toHaveBeenCalledTimes(1);
        });
      });
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
        queryByRole('option', { name: new RegExp(authOptionStrings.federatedIdentityLabel) })
      ).not.toBeInTheDocument();
    });
  });

  it('renders core actions and disables save while saving', async () => {
    const toasts = createToastsMock();
    const client = createClientMock();
    const services: DataFederationKibanaServices = {
      dataSourcesClient: client,
      datasetsClient: createDatasetsClientMock(),
      serviceRegistry: createServiceRegistry(),
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
      serviceRegistry: createServiceRegistry(),
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
    fireEvent.click(await findByText(authOptionStrings.anonymousLabel));
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
      serviceRegistry: createServiceRegistry(),
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
      serviceRegistry: createServiceRegistry(),
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
    fireEvent.click(await findByText(authOptionStrings.anonymousLabel));
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

      fireEvent.click(
        within(getByTestId('createDataSourceFlyoutS3FederatedSetupMethod-manual')).getByRole(
          'radio'
        )
      );
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

  // The setup creates several ARNs (provider, policy, stack), so pasting the wrong one is easy.
  it.each([
    'arn:aws:iam::123456789012:oidc-provider/workload-identity-issuer.example/orgs/org-abc123',
    'arn:aws:iam::123456789012:policy/elastic-s3-read',
    'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-datasources/0f1e2d3c',
    'elastic-s3-read',
  ])('rejects %s as the role ARN', async (roleArn) => {
    const onSave = jest.fn().mockResolvedValue(null);
    const { getByTestId, findByText } = renderFederatedS3EditFlyout(onSave);

    fireEvent.change(getByTestId('createDataSourceFlyoutS3FederatedRoleArn'), {
      target: { value: roleArn },
    });
    fireEvent.click(getByTestId('createDataSourceFlyoutSubmit'));

    expect(await findByText(/Enter the ARN of an IAM role/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each([
    ' arn:aws:iam::123456789012:role/service-role/elastic-s3-read ',
    'arn:aws-us-gov:iam::123456789012:role/elastic-s3-read',
    'arn:aws-cn:iam::123456789012:role/elastic-s3-read',
  ])('accepts %p as the role ARN', async (roleArn) => {
    const onSave = jest.fn().mockResolvedValue(null);
    const { getByTestId } = renderFederatedS3EditFlyout(onSave);

    fireEvent.change(getByTestId('createDataSourceFlyoutS3FederatedRoleArn'), {
      target: { value: roleArn },
    });
    fireEvent.click(getByTestId('createDataSourceFlyoutSubmit'));

    await waitFor(() => {
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

  describe('S3 connection settings in the update request', () => {
    const connectionSettings = {
      region: 'eu-central-1',
      endpoint: 'https://s3.example.com',
      addressing_style: 'path',
    };

    const renderEditFlyoutWithUpdateClient = (settings: S3DataSourceWithSecrets['settings']) => {
      const initialDataSource: S3DataSourceWithSecrets = {
        type: 's3',
        name: 'ds',
        description: '',
        settings: { ...connectionSettings, ...settings },
      };
      const put = jest.fn().mockResolvedValue(undefined);
      const updateClient = new DataSourcesClient({ put } as unknown as HttpStart);
      const services: DataFederationKibanaServices = {
        dataSourcesClient: createClientMock(),
        datasetsClient: createDatasetsClientMock(),
        serviceRegistry: createServiceRegistry(),
        toasts: createToastsMock(),
        docLinks: createDocLinksMock(),
        featureFlags: {},
        cloudInfo: {
          jwtIssuer: 'https://issuer.example.com',
          deploymentId: 'deployment:abc123',
          isServerless: false,
          awsCloudFormationTemplateUrl: 'https://cft.s3.amazonaws.com/aws/v1/datasource-cft.yml',
        },
      };

      const view = render(
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <CreateDataSourceFlyout
              onClose={jest.fn()}
              onSave={async (dataSource) => {
                await updateClient.update(dataSource);
                return null;
              }}
              existingDataSourceNames={[]}
              initialDataSource={initialDataSource}
            />
          </KibanaContextProvider>
        </EuiProvider>
      );

      return { ...view, put };
    };

    const submitAndGetRequestSettings = async (
      getByTestId: ReturnType<typeof render>['getByTestId'],
      put: jest.Mock
    ) => {
      fireEvent.click(getByTestId('createDataSourceFlyoutSubmit'));
      await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
      const [path, { body }] = put.mock.calls[0];
      expect(path).toBe(getDataSourceByIdApiPath('ds'));
      return JSON.parse(body).settings;
    };

    it.each([
      ['federated identity', { role_arn: 'arn:aws:iam::123456789012:role/read' }],
      ['access and secret keys', { access_key: 'AKIA', secret_key: '::es_redacted::' }],
      ['anonymous', { auth: 'anonymous' }],
    ])('sends region, endpoint, and addressing_style with %s auth', async (_, authSettings) => {
      const { getByTestId, put } = renderEditFlyoutWithUpdateClient(authSettings);

      expect(await submitAndGetRequestSettings(getByTestId, put)).toMatchObject(connectionSettings);
    });

    it('sends region, endpoint, and addressing_style after the auth mode is changed', async () => {
      const { getByTestId, getByText, put } = renderEditFlyoutWithUpdateClient({
        role_arn: 'arn:aws:iam::123456789012:role/read',
      });

      fireEvent.click(getByTestId('createDataSourceFlyoutAuthentication'));
      fireEvent.click(getByText(authOptionStrings.anonymousLabel));

      const settings = await submitAndGetRequestSettings(getByTestId, put);
      expect(settings).toMatchObject({ ...connectionSettings, auth: 'anonymous' });
      expect(settings).not.toHaveProperty('role_arn');
    });
  });
});
