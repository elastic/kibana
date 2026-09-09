/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
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

const { updateCloudConnector: mockUpdateCloudConnector } = jest.requireMock(
  '../hooks/use_update_cloud_connector'
) as { updateCloudConnector: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>> };

const mockHttp = { put: jest.fn() };

let queryClient: QueryClient;

// ---------- helpers ----------

const renderWithIntl = (component: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>{component}</I18nProvider>
    </QueryClientProvider>
  );

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
    isIacProvisionerEnabled: false,
  });

  mockUpdateCloudConnector.mockResolvedValue({});
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
    const credentialsWithId: AwsCloudConnectorCredentials = {
      roleArn: undefined,
      externalId: undefined,
      cloudConnectorId: 'connector-1',
    };

    it('(a) key_mismatch: renders callout and calls onValidityChange(false)', async () => {
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
      expect(onValidityChange).toHaveBeenCalledWith(false);
    });

    it('(b) no_key: renders callout and calls onValidityChange(true)', async () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: false, reason: 'no_key', integrations: [] },
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
      expect(onValidityChange).toHaveBeenCalledWith(true);
    });

    it('(c) matches: no callout, onValidityChange(true)', async () => {
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

      await waitFor(() => {
        expect(
          screen.queryByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT)
        ).not.toBeInTheDocument();
      });
      expect(onValidityChange).toHaveBeenCalledWith(true);
    });

    it('(d) query error: no callout, onValidityChange(true) — fail open', () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockUseVerifyIacKey.mockReturnValue({
        data: undefined,
        isFetching: false,
        refetch: mockRefetch,
        isError: true,
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
      // data is undefined → isBlocking is false → fail-open → onValidityChange(true)
      expect(onValidityChange).toHaveBeenCalledWith(true);
    });

    it('(e) IaCP disabled: useVerifyIacKey called with enabled: false', () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });

      renderWithIntl(
        <AWSReusableConnectorForm {...defaultProps} credentials={credentialsWithId} />
      );

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });

    it('(e2) IaCP disabled: onValidityChange is NOT called', () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
      const onValidityChange = jest.fn();

      renderWithIntl(
        <AWSReusableConnectorForm
          {...defaultProps}
          credentials={credentialsWithId}
          onValidityChange={onValidityChange}
        />
      );

      expect(onValidityChange).not.toHaveBeenCalled();
    });

    it('(f) clicking Update reports telemetry and invokes launchButtonProps.onClick', async () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockUseVerifyIacKey.mockReturnValue({
        data: {
          matches: false,
          reason: 'key_mismatch',
          integrations: [],
          deploymentId: undefined,
        },
        isFetching: false,
        refetch: mockRefetch,
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      renderWithIntl(
        <AWSReusableConnectorForm {...defaultProps} credentials={credentialsWithId} />
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.UPDATE_STACK_BUTTON)
        ).toBeInTheDocument();
      });

      await userEvent.click(
        screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.UPDATE_STACK_BUTTON)
      );

      expect(mockReportEvent).toHaveBeenCalledWith(
        'iac_provisioner_key_check_action',
        expect.objectContaining({
          surface: 'wizard',
          action: 'update_stack_clicked',
          reason: 'key_mismatch',
          hasDeploymentId: false,
        })
      );
      expect(mockLaunchOnClick).toHaveBeenCalledTimes(1);
    });

    it('(g) clicking Verify reports telemetry and calls refetch', async () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: false, reason: 'no_key', integrations: [] },
        isFetching: false,
        refetch: mockRefetch,
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      renderWithIntl(
        <AWSReusableConnectorForm {...defaultProps} credentials={credentialsWithId} />
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.VERIFY_BUTTON)
        ).toBeInTheDocument();
      });

      await userEvent.click(
        screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.VERIFY_BUTTON)
      );

      expect(mockReportEvent).toHaveBeenCalledWith(
        'iac_provisioner_key_check_action',
        expect.objectContaining({ action: 'verify_clicked' })
      );
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('(h) onTemplateRendered calls updateCloudConnector with (http, id, { iac_key }), invalidates both query keys, and does not toast', async () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      let capturedOnTemplateRendered: ((r: { key?: string }) => void) | undefined;
      mockUseCloudConnectorTemplate.mockImplementation(({ onTemplateRendered }) => {
        capturedOnTemplateRendered = onTemplateRendered;
        return {
          launchButtonProps: { onClick: mockLaunchOnClick },
          isDisabled: false,
          isGeneratingTemplate: false,
          isIacProvisionerEnabled: true,
        };
      });

      const mockAddSuccess = jest.fn();
      useStartServices.mockReturnValue({
        analytics: { reportEvent: mockReportEvent },
        http: mockHttp,
        notifications: { toasts: { addSuccess: mockAddSuccess } },
      });

      renderWithIntl(
        <AWSReusableConnectorForm {...defaultProps} credentials={credentialsWithId} />
      );

      await act(async () => {
        capturedOnTemplateRendered?.({ key: 'sha256:new' });
      });

      expect(mockUpdateCloudConnector).toHaveBeenCalledWith(mockHttp, 'connector-1', {
        iac_key: 'sha256:new',
      });
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith(['get-cloud-connectors']);
        expect(invalidateQueriesSpy).toHaveBeenCalledWith(['cloud-connector-usage', 'connector-1']);
      });
      // The optimistic write uses the raw request helper — no success toast should fire.
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });

    it('(i) useCloudConnectorTemplate receives integrations, deploymentId, and provider aws', () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });

      const integrations = [{ name: 'cloud_security_posture', policyTemplates: ['cspm'] }];
      const deploymentId = 'arn:aws:cloudformation:us-east-1:123:stack/my-stack/abc';

      mockUseVerifyIacKey.mockReturnValue({
        data: { matches: true, integrations, deploymentId },
        isFetching: false,
        refetch: mockRefetch,
      } as unknown as ReturnType<typeof useVerifyIacKey>);

      renderWithIntl(
        <AWSReusableConnectorForm {...defaultProps} credentials={credentialsWithId} />
      );

      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'aws',
          integrations,
          deploymentId,
        })
      );
    });
  });
});
