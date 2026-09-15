/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import {
  AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ,
  CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS,
} from '../../../../common/services/cloud_connectors/test_subjects';

import type { AwsCloudConnectorCredentials } from '../types';
import { useVerifyIacKey } from '../hooks/use_verify_iac_key';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';
import { getMockPolicyAWS, getMockPackageInfoAWS } from '../test/mock';

import { AWSReusableConnectorForm } from './aws_reusable_connector_form';

// ---------- module mocks ----------

jest.mock('../hooks/use_get_cloud_connectors');
jest.mock('../hooks/use_verify_iac_key');
jest.mock('../hooks/use_cloud_connector_template');
jest.mock('../../../hooks', () => ({
  useIacProvisioner: jest.fn(),
  useStartServices: jest.fn(),
}));
jest.mock('../hooks/use_update_cloud_connector', () => ({
  updateCloudConnector: jest.fn(() => Promise.resolve({})),
}));

// ---------- typed references ----------

interface UseGetCloudConnectorsReturn {
  data:
    | Array<{
        id: string;
        name: string;
        vars: Record<string, { value: string }>;
      }>
    | undefined;
  isLoading: boolean;
}

const mockUseGetCloudConnectors = jest.requireMock('../hooks/use_get_cloud_connectors')
  .useGetCloudConnectors as jest.MockedFunction<
  (options?: { cloudProvider?: string; accountType?: string }) => UseGetCloudConnectorsReturn
>;

const mockUseVerifyIacKey = useVerifyIacKey as jest.MockedFunction<typeof useVerifyIacKey>;
const mockUseCloudConnectorTemplate = useCloudConnectorTemplate as jest.MockedFunction<
  typeof useCloudConnectorTemplate
>;

const { useIacProvisioner, useStartServices } = jest.requireMock('../../../hooks') as {
  useIacProvisioner: jest.MockedFunction<() => { isIacProvisionerEnabled: boolean }>;
  useStartServices: jest.MockedFunction<
    () => { analytics: { reportEvent: jest.Mock }; http: typeof mockHttp; notifications?: unknown }
  >;
};

const mockHttp = { put: jest.fn() };

let queryClient: QueryClient;

// ---------- helpers ----------

const withProviders = (component: React.ReactElement) => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>{component}</I18nProvider>
  </QueryClientProvider>
);
const renderWithIntl = (component: React.ReactElement) => render(withProviders(component));

const mockCloudConnectors = [
  {
    id: 'connector-1',
    name: 'AWS Connector 1',
    vars: {
      role_arn: { value: 'arn:aws:iam::123456789012:role/Role1' },
      external_id: { value: 'external-id-123' },
    },
  },
  {
    id: 'connector-2',
    name: 'AWS Connector 2',
    vars: {
      role_arn: { value: 'arn:aws:iam::123456789012:role/Role2' },
      external_id: { value: 'external-id-456' },
    },
  },
];

const mockLaunchOnClick = jest.fn();
const mockRefetch = jest.fn();
const mockReportEvent = jest.fn();

const mockPolicy = getMockPolicyAWS();
const mockPackageInfo = getMockPackageInfoAWS();

// ---------- shared before/after ----------

beforeEach(() => {
  jest.clearAllMocks();

  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  mockUseGetCloudConnectors.mockReturnValue({ data: mockCloudConnectors, isLoading: false });

  useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
  useStartServices.mockReturnValue({ analytics: { reportEvent: mockReportEvent }, http: mockHttp });

  mockUseVerifyIacKey.mockReturnValue({
    data: undefined,
    isFetching: false,
    refetch: mockRefetch,
    isSuccess: false,
    isError: false,
    isLoading: false,
  } as unknown as ReturnType<typeof useVerifyIacKey>);

  mockUseCloudConnectorTemplate.mockReturnValue({
    launchButtonProps: { onClick: mockLaunchOnClick },
    isDisabled: false,
    isGeneratingTemplate: false,
    clearIacConfirm: jest.fn(),
    isIacProvisionerEnabled: false,
  });
});

// ---------- test suite ----------

describe('AWSReusableConnectorForm', () => {
  const mockSetCredentials = jest.fn();

  const defaultProps = {
    cloudConnectorId: undefined,
    isEditPage: false,
    credentials: {
      roleArn: undefined,
      externalId: undefined,
      cloudConnectorId: undefined,
    } as AwsCloudConnectorCredentials,
    setCredentials: mockSetCredentials,
    newPolicy: mockPolicy,
    packageInfo: mockPackageInfo,
  };

  describe('Rendering', () => {
    it('renders the combo box with instructions', () => {
      renderWithIntl(<AWSReusableConnectorForm {...defaultProps} />);

      expect(screen.getByText(/To streamline your AWS integration process/i)).toBeInTheDocument();
      expect(screen.getByText('Federated Identity Name')).toBeInTheDocument();

      const comboBox = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      expect(comboBox).toBeInTheDocument();
    });

    it('renders combo box with available connectors as options', async () => {
      renderWithIntl(<AWSReusableConnectorForm {...defaultProps} />);

      const comboBox = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await userEvent.click(comboBox);

      await waitFor(() => {
        expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
        expect(screen.getByText('AWS Connector 2')).toBeInTheDocument();
      });
    });

    it('renders with no connectors available', () => {
      mockUseGetCloudConnectors.mockReturnValue({ data: [], isLoading: false });

      renderWithIntl(<AWSReusableConnectorForm {...defaultProps} />);

      expect(screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ)).toBeInTheDocument();
    });

    it('renders with selected connector when cloudConnectorId is provided', async () => {
      renderWithIntl(<AWSReusableConnectorForm {...defaultProps} cloudConnectorId="connector-1" />);

      await waitFor(() => {
        expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
      });
    });

    it('renders with selected connector when credentials.cloudConnectorId is provided', async () => {
      renderWithIntl(
        <AWSReusableConnectorForm
          {...defaultProps}
          credentials={{ ...defaultProps.credentials, cloudConnectorId: 'connector-2' }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('AWS Connector 2')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('calls setCredentials with correct values when a connector is selected', async () => {
      renderWithIntl(<AWSReusableConnectorForm {...defaultProps} />);

      const comboBox = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await userEvent.click(comboBox);

      const connectorOption = await screen.findByText('AWS Connector 1');
      await userEvent.click(connectorOption);

      expect(mockSetCredentials).toHaveBeenCalledWith({
        name: 'AWS Connector 1',
        roleArn: 'arn:aws:iam::123456789012:role/Role1',
        externalId: 'external-id-123',
        cloudConnectorId: 'connector-1',
      });
    });

    it('calls setCredentials with second connector values when selected', async () => {
      renderWithIntl(<AWSReusableConnectorForm {...defaultProps} />);

      const comboBox = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await userEvent.click(comboBox);

      await waitFor(() => {
        expect(screen.getByText('AWS Connector 2')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('AWS Connector 2'));

      expect(mockSetCredentials).toHaveBeenCalledWith({
        name: 'AWS Connector 2',
        roleArn: 'arn:aws:iam::123456789012:role/Role2',
        externalId: 'external-id-456',
        cloudConnectorId: 'connector-2',
      });
    });
  });

  describe('Hook Integration', () => {
    it('calls useGetCloudConnectors with correct provider', () => {
      renderWithIntl(<AWSReusableConnectorForm {...defaultProps} />);

      expect(mockUseGetCloudConnectors).toHaveBeenCalledWith({
        cloudProvider: 'aws',
        accountType: undefined,
        packageName: undefined,
      });
    });

    it('calls useGetCloudConnectors with single-account filter', () => {
      renderWithIntl(<AWSReusableConnectorForm {...defaultProps} accountType="single-account" />);

      expect(mockUseGetCloudConnectors).toHaveBeenCalledWith({
        cloudProvider: 'aws',
        accountType: 'single-account',
        packageName: undefined,
      });
    });

    it('calls useGetCloudConnectors with organization-account filter', () => {
      renderWithIntl(
        <AWSReusableConnectorForm {...defaultProps} accountType="organization-account" />
      );

      expect(mockUseGetCloudConnectors).toHaveBeenCalledWith({
        cloudProvider: 'aws',
        accountType: 'organization-account',
        packageName: undefined,
      });
    });

    it('handles empty connector list', async () => {
      mockUseGetCloudConnectors.mockReturnValue({ data: [], isLoading: false });

      renderWithIntl(<AWSReusableConnectorForm {...defaultProps} />);

      const comboBox = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await userEvent.click(comboBox);

      await waitFor(() => {
        expect(screen.queryByText('AWS Connector 1')).not.toBeInTheDocument();
        expect(screen.queryByText('AWS Connector 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('IaC key check', () => {
    // Component-level behaviour (callout states, validity reporting, stack update) is covered in
    // components/iac_key_check.test.tsx; these cases check what the form feeds into it.
    const credentialsWithId: AwsCloudConnectorCredentials = {
      roleArn: undefined,
      externalId: undefined,
      cloudConnectorId: 'connector-1',
    };
    const expectedIntegrations = [
      {
        name: 'cloud_security_posture',
        policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
      },
    ];

    it('derives one integration from the policy inputs and package and checks the selected connector', () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });

      renderWithIntl(
        <AWSReusableConnectorForm {...defaultProps} credentials={credentialsWithId} />
      );

      // The wizard leaves IacKeyCheck's surface at its default.
      expect(mockUseVerifyIacKey).toHaveBeenCalledWith({
        cloudConnectorId: 'connector-1',
        integrations: expectedIntegrations,
        surface: 'wizard',
        enabled: true,
      });
    });

    it('sends no integrations and disables the check when the policy has no enabled inputs', () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });

      renderWithIntl(
        <AWSReusableConnectorForm
          {...defaultProps}
          credentials={credentialsWithId}
          newPolicy={{ ...mockPolicy, inputs: [] }}
        />
      );

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith({
        cloudConnectorId: 'connector-1',
        integrations: [],
        surface: 'wizard',
        enabled: false,
      });
    });

    it('disables the check when IaCP is off', () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
      const onValidityChange = jest.fn();

      renderWithIntl(
        <AWSReusableConnectorForm
          {...defaultProps}
          credentials={credentialsWithId}
          onValidityChange={onValidityChange}
        />
      );

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
      expect(onValidityChange).not.toHaveBeenCalled();
    });

    it('on key_mismatch renders the callout naming the package and reports invalid', async () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: false, reason: 'key_mismatch', integrations: [] },
        isFetching: false,
        refetch: mockRefetch,
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      const onValidityChange = jest.fn();
      renderWithIntl(
        <AWSReusableConnectorForm
          {...defaultProps}
          credentials={credentialsWithId}
          onValidityChange={onValidityChange}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT)
        ).toBeInTheDocument();
      });
      expect(screen.getByText(mockPackageInfo.title)).toBeInTheDocument();
      expect(onValidityChange).toHaveBeenCalledWith(false);
    });

    it('on match renders no callout and reports valid', async () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: true, integrations: [] },
        isFetching: false,
        refetch: mockRefetch,
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      const onValidityChange = jest.fn();
      renderWithIntl(
        <AWSReusableConnectorForm
          {...defaultProps}
          credentials={credentialsWithId}
          onValidityChange={onValidityChange}
        />
      );

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT)
      ).not.toBeInTheDocument();
      await waitFor(() => expect(onValidityChange).toHaveBeenCalledWith(true));
    });
  });
});
