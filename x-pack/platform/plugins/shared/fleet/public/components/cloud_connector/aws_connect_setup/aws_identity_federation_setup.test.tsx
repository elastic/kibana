/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { SINGLE_ACCOUNT } from '../../../../common';

import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { useCreateCloudConnector } from '../hooks/use_create_cloud_connector';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';

import { AwsIdentityFederationSetup } from './aws_identity_federation_setup';
import type { CloudSetupForCloudConnector } from '../types';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../hooks/use_get_cloud_connectors');
jest.mock('../hooks/use_create_cloud_connector');
jest.mock('../hooks/use_cloud_connector_template');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseGetCloudConnectors = useGetCloudConnectors as jest.MockedFunction<
  typeof useGetCloudConnectors
>;
const mockUseCreateCloudConnector = useCreateCloudConnector as jest.MockedFunction<
  typeof useCreateCloudConnector
>;
const mockUseCloudConnectorTemplate = useCloudConnectorTemplate as jest.MockedFunction<
  typeof useCloudConnectorTemplate
>;

const mockCloudConnectors = [
  {
    id: 'connector-1',
    name: 'AWS Connector 1',
    cloudProvider: 'aws',
    accountType: SINGLE_ACCOUNT,
    vars: {
      role_arn: { value: 'arn:aws:iam::123456789012:role/Role1' },
      external_id: { value: 'external-id-1' },
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

describe('AwsIdentityFederationSetup', () => {
  let queryClient: QueryClient;
  const onConnectorIdChange = jest.fn();
  const onReadyChange = jest.fn();

  const mockGetConnectors = (overrides: Partial<ReturnType<typeof useGetCloudConnectors>> = {}) => {
    mockUseGetCloudConnectors.mockReturnValue({
      data: mockCloudConnectors,
      isLoading: false,
      ...overrides,
    } as unknown as ReturnType<typeof useGetCloudConnectors>);
  };

  const renderSetup = (
    props: Partial<React.ComponentProps<typeof AwsIdentityFederationSetup>> = {}
  ) =>
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AwsIdentityFederationSetup
            onReadyChange={onReadyChange}
            onConnectorIdChange={onConnectorIdChange}
            {...props}
          />
        </QueryClientProvider>
      </I18nProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    mockUseKibana.mockReturnValue({
      services: { application: { navigateToApp: jest.fn() } },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseCreateCloudConnector.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useCreateCloudConnector>);

    mockUseCloudConnectorTemplate.mockReturnValue({
      launchButtonProps: { href: 'https://cf.example', target: '_blank' },
      isDisabled: false,
      isGeneratingTemplate: false,
    });

    mockGetConnectors();
  });

  it('emits undefined id and name when nothing is selected', () => {
    renderSetup();
    expect(onConnectorIdChange).toHaveBeenCalledWith(undefined, undefined);
  });

  describe('initialConnectorId (edit flow)', () => {
    it('does not emit while the name for the seeded id is still loading', () => {
      mockGetConnectors({ data: undefined, isLoading: true });
      renderSetup({ initialConnectorId: 'connector-1' });

      // The id is known but its name isn't resolved yet — emitting here would persist
      // a connector with no name and render an empty summary row downstream.
      expect(onConnectorIdChange).not.toHaveBeenCalled();
    });

    it('still reports readiness while the name is loading', () => {
      mockGetConnectors({ data: undefined, isLoading: true });
      renderSetup({ initialConnectorId: 'connector-1' });

      // Readiness depends on the id alone and must not be held back by the name.
      expect(onReadyChange).toHaveBeenCalledWith(true);
    });

    it('emits id and name once the connector list resolves', async () => {
      renderSetup({ initialConnectorId: 'connector-1' });

      await waitFor(() => {
        expect(onConnectorIdChange).toHaveBeenCalledWith('connector-1', 'AWS Connector 1');
      });
    });

    it('emits the id even when the seeded connector is absent from the list', async () => {
      mockGetConnectors({ data: [] });
      renderSetup({ initialConnectorId: 'missing-connector' });

      // The list finished loading and the id isn't in it, so the name will never arrive —
      // emit rather than holding the value back forever.
      await waitFor(() => {
        expect(onConnectorIdChange).toHaveBeenCalledWith('missing-connector', undefined);
      });
    });
  });

  describe('create flow', () => {
    it('emits id and name together after a connector is created', async () => {
      let onSuccess: ((connector: { id: string; name: string }) => void) | undefined;
      mockUseCreateCloudConnector.mockImplementation((cb) => {
        onSuccess = cb as typeof onSuccess;
        return { mutate: jest.fn(), isLoading: false } as unknown as ReturnType<
          typeof useCreateCloudConnector
        >;
      });

      renderSetup();
      onConnectorIdChange.mockClear();

      // The created connector's name comes straight off the mutation response, so it is
      // available before the invalidated connector-list query refetches.
      act(() => {
        onSuccess?.({ id: 'new-connector', name: 'Freshly Created' });
      });

      await waitFor(() => {
        expect(onConnectorIdChange).toHaveBeenCalledWith('new-connector', 'Freshly Created');
      });
      expect(onConnectorIdChange).not.toHaveBeenCalledWith('new-connector', undefined);
    });

    it('passes IaC confirm onto create after a successful render', async () => {
      const mutate = jest.fn();
      mockGetConnectors({ data: [] });
      mockUseCreateCloudConnector.mockReturnValue({
        mutate,
        isLoading: false,
      } as unknown as ReturnType<typeof useCreateCloudConnector>);
      mockUseCloudConnectorTemplate.mockReturnValue({
        launchButtonProps: { onClick: jest.fn() },
        isDisabled: false,
        isGeneratingTemplate: false,
        iacConfirm: {
          iac_key: 'sha256:abc',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: 'v1',
        },
      });

      const { getByTestId } = renderSetup();
      fireEvent.change(getByTestId('awsIdentityFederationSetup-connectorName'), {
        target: { value: 'guardduty-connector' },
      });
      fireEvent.change(getByTestId('awsIdentityFederationSetup-roleArn'), {
        target: { value: 'arn:aws:iam::1:role/Role' },
      });
      fireEvent.click(getByTestId('awsIdentityFederationSetup-createButton'));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'guardduty-connector',
          iac_key: 'sha256:abc',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: 'v1',
        })
      );
    });
  });
  describe('CloudFormation launch', () => {
    const WII_TEMPLATE_URL =
      'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-federated-identity-wii-aws-9.6.0.yml&stackName=Elastic-Workload-Identity-RESOURCE_ID&param_ElasticIssuer=ISSUER&param_ElasticSubject=SUBJECT';
    const LEGACY_TEMPLATE_URL =
      'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-federated-identity-aws-9.6.0.yml';

    // cloudId payload: host$esComponentId$kibanaComponentId
    const echCloud: CloudSetupForCloudConnector = {
      isCloudEnabled: true,
      isServerlessEnabled: false,
      cloudId: `qa:${btoa(
        'eu-west-1.aws.qa.cld.elstc.co$es-component-id$3a127b696031473aba8624d0cb17ec43'
      )}`,
      deploymentUrl: 'https://console.qa.cld.elstc.co/deployments/1f2e3d4c5b6a79808172635445362718',
      organizationId: '2070044029',
      serverless: {},
    };

    const mockLaunch = (isDisabled: boolean) => {
      mockUseCloudConnectorTemplate.mockReturnValue({
        launchButtonProps: {
          href: isDisabled ? undefined : 'https://cf.example',
          target: '_blank',
        },
        isDisabled,
        isGeneratingTemplate: false,
      });
    };

    beforeEach(() => {
      // no existing connectors, so the New Identity tab with the launch button is shown
      mockGetConnectors({ data: [] });
    });

    it('hands the cloud context and template URL to the launch hook', () => {
      mockLaunch(false);
      const { getByTestId, queryByTestId } = renderSetup({
        cloud: echCloud,
        iacTemplateUrl: WII_TEMPLATE_URL,
      });

      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          cloud: echCloud,
          accountType: 'single-account',
          iacTemplateUrl: WII_TEMPLATE_URL,
        })
      );
      expect(getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toHaveAttribute(
        'href',
        'https://cf.example'
      );
      expect(queryByTestId('cloudFormationTemplateUnavailableCallout')).not.toBeInTheDocument();
    });

    it('explains what is missing when the Workload Identity template cannot be pre-filled', () => {
      mockLaunch(true);
      const { getByTestId } = renderSetup({
        cloud: { ...echCloud, organizationId: undefined },
        iacTemplateUrl: WII_TEMPLATE_URL,
      });

      expect(getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeDisabled();
      expect(getByTestId('cloudFormationTemplateUnavailableCallout')).toHaveTextContent(
        'Elastic Cloud organization ID'
      );
    });

    it('shows the Workload Identity guide only for templates that ask for the issuer', () => {
      mockLaunch(false);
      const wii = renderSetup({ cloud: echCloud, iacTemplateUrl: WII_TEMPLATE_URL });
      expect(wii.container).toHaveTextContent('ElasticIssuer');
      wii.unmount();

      const legacy = renderSetup({ cloud: echCloud, iacTemplateUrl: LEGACY_TEMPLATE_URL });
      expect(legacy.container).not.toHaveTextContent('ElasticIssuer');
      expect(legacy.container).toHaveTextContent('External ID');
      expect(
        legacy.queryByTestId('cloudFormationTemplateUnavailableCallout')
      ).not.toBeInTheDocument();
    });

    it('does not render the callout when no template URL is declared', () => {
      mockLaunch(true);
      const { getByTestId, queryByTestId } = renderSetup({ cloud: echCloud });

      expect(getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeDisabled();
      expect(queryByTestId('cloudFormationTemplateUnavailableCallout')).not.toBeInTheDocument();
    });
  });
});
