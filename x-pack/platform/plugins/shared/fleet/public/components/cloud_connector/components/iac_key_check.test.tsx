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

import { CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';
import type { RenderIacTemplateIntegration } from '../../../../common/types/rest_spec/iac_provisioner';
import { useVerifyIacKey } from '../hooks/use_verify_iac_key';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';

import { IacKeyCheck } from './iac_key_check';

// ---------- module mocks ----------

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

const withProviders = (component: React.ReactElement) => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>{component}</I18nProvider>
  </QueryClientProvider>
);
const renderWithIntl = (component: React.ReactElement) => render(withProviders(component));

const mockLaunchOnClick = jest.fn();
const mockRefetch = jest.fn();
const mockReportEvent = jest.fn();

const integrations: RenderIacTemplateIntegration[] = [
  { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
  { name: 'aws_logs', policyTemplates: [{ name: 'generic', enabledInputs: ['aws-s3'] }] },
];

const mockVerifyResult = (data: unknown) =>
  mockUseVerifyIacKey.mockReturnValue({
    data,
    isFetching: false,
    refetch: mockRefetch,
  } as unknown as ReturnType<typeof useVerifyIacKey>);

const defaultProps = {
  cloudConnectorId: 'connector-1',
  integrations,
};

// ---------- shared before/after ----------

beforeEach(() => {
  jest.clearAllMocks();

  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
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
    isIacProvisionerEnabled: true,
  });

  mockUpdateCloudConnector.mockResolvedValue({});
});

// ---------- test suite ----------

describe('IacKeyCheck', () => {
  describe('enabling the check', () => {
    it('passes the connector id and every integration to useVerifyIacKey', () => {
      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith({
        cloudConnectorId: 'connector-1',
        integrations,
        enabled: true,
      });
    });

    it('is disabled when there are no integrations, so no request is made', () => {
      const onValidityChange = jest.fn();

      renderWithIntl(
        <IacKeyCheck {...defaultProps} integrations={[]} onValidityChange={onValidityChange} />
      );

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(
        expect.objectContaining({ integrations: [], enabled: false })
      );
      expect(onValidityChange).not.toHaveBeenCalled();
    });

    it('is disabled when IaCP is off and does not report validity', () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
      const onValidityChange = jest.fn();

      renderWithIntl(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />);

      expect(mockUseVerifyIacKey).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
      expect(onValidityChange).not.toHaveBeenCalled();
    });
  });

  describe('rendering the verdict', () => {
    it('renders nothing while there is no verdict yet', () => {
      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT)
      ).not.toBeInTheDocument();
    });

    it('is hidden when the deployed template matches and reports valid', async () => {
      mockVerifyResult({ matches: true, integrations: [] });
      const onValidityChange = jest.fn();

      renderWithIntl(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />);

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT)
      ).not.toBeInTheDocument();
      await waitFor(() => expect(onValidityChange).toHaveBeenCalledWith(true));
    });

    it('renders the callout on key_mismatch and reports invalid', async () => {
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
      const onValidityChange = jest.fn();

      renderWithIntl(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />);

      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT)
        ).toBeInTheDocument();
      });
      expect(onValidityChange).toHaveBeenCalledWith(false);
    });

    it('renders the callout on no_key but does not block', async () => {
      mockVerifyResult({ matches: false, reason: 'no_key', integrations: [] });
      const onValidityChange = jest.fn();

      renderWithIntl(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />);

      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT)
        ).toBeInTheDocument();
      });
      expect(onValidityChange).toHaveBeenCalledWith(true);
    });

    it('names the integration in the callout when a title is given', async () => {
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });

      renderWithIntl(<IacKeyCheck {...defaultProps} integrationTitle="AWS CloudTrail" />);

      await waitFor(() => expect(screen.getByText('AWS CloudTrail')).toBeInTheDocument());
    });

    it('fails open on a query error: no callout, reports valid', () => {
      mockUseVerifyIacKey.mockReturnValue({
        data: undefined,
        isFetching: false,
        refetch: mockRefetch,
        isError: true,
      } as unknown as ReturnType<typeof useVerifyIacKey>);
      const onValidityChange = jest.fn();

      renderWithIntl(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />);

      expect(
        screen.queryByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT)
      ).not.toBeInTheDocument();
      // data is undefined → isBlocking is false → fail-open → onValidityChange(true)
      expect(onValidityChange).toHaveBeenCalledWith(true);
    });
  });

  describe('reporting validity', () => {
    it('reports only when the blocking state changes, not when the callback identity changes', async () => {
      // The wizard re-creates updatePolicy (and therefore onValidityChange) after every policy
      // update; re-firing on identity would loop: report → update → new callback → report …
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });

      const first = jest.fn();
      const { rerender } = renderWithIntl(
        <IacKeyCheck {...defaultProps} onValidityChange={first} />
      );
      await waitFor(() => expect(first).toHaveBeenCalledWith(false));
      expect(first).toHaveBeenCalledTimes(1);

      // Same blocking state, new callback identity (what the wizard does after each update).
      const second = jest.fn();
      rerender(withProviders(<IacKeyCheck {...defaultProps} onValidityChange={second} />));
      expect(second).not.toHaveBeenCalled();
      expect(first).toHaveBeenCalledTimes(1);

      // Blocking state clears → the latest callback is told once.
      mockVerifyResult({ matches: true, integrations: [] });
      rerender(withProviders(<IacKeyCheck {...defaultProps} onValidityChange={second} />));
      await waitFor(() => expect(second).toHaveBeenCalledWith(true));
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  describe('actions', () => {
    it('clicking Update reports telemetry and invokes launchButtonProps.onClick', async () => {
      mockVerifyResult({
        matches: false,
        reason: 'key_mismatch',
        integrations: [],
        deploymentId: undefined,
      });

      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      await userEvent.click(
        await screen.findByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.UPDATE_STACK_BUTTON)
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

    it('clicking Verify reports telemetry and refetches', async () => {
      mockVerifyResult({ matches: false, reason: 'no_key', integrations: [] });

      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      await userEvent.click(
        await screen.findByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.VERIFY_BUTTON)
      );

      expect(mockReportEvent).toHaveBeenCalledWith(
        'iac_provisioner_key_check_action',
        expect.objectContaining({ action: 'verify_clicked' })
      );
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('onTemplateRendered stores the key, invalidates both query keys, and does not toast', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      let capturedOnTemplateRendered:
        | ((r: { key?: string; integrations: RenderIacTemplateIntegration[] }) => void)
        | undefined;
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

      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      await act(async () => {
        capturedOnTemplateRendered?.({ key: 'sha256:new', integrations: [] });
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

    it('onTemplateRendered without a key writes nothing', async () => {
      let capturedOnTemplateRendered:
        | ((r: { key?: string; integrations: RenderIacTemplateIntegration[] }) => void)
        | undefined;
      mockUseCloudConnectorTemplate.mockImplementation(({ onTemplateRendered }) => {
        capturedOnTemplateRendered = onTemplateRendered;
        return {
          launchButtonProps: { onClick: mockLaunchOnClick },
          isDisabled: false,
          isGeneratingTemplate: false,
          isIacProvisionerEnabled: true,
        };
      });

      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      await act(async () => {
        capturedOnTemplateRendered?.({ integrations: [] });
      });

      expect(mockUpdateCloudConnector).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    it('hands the server-merged set, deployment id, and provider aws to useCloudConnectorTemplate', () => {
      const merged = [
        {
          name: 'cloud_security_posture',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
        },
      ];
      const deploymentId = 'arn:aws:cloudformation:us-east-1:123:stack/my-stack/abc';
      mockVerifyResult({ matches: true, integrations: merged, deploymentId });

      renderWithIntl(<IacKeyCheck {...defaultProps} accountType="organization-account" />);

      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'aws',
          accountType: 'organization-account',
          integrations: merged,
          deploymentId,
        })
      );
    });

    it('opts out of the static template fallback', () => {
      // This identity already has a generated template; the static one would downgrade it.
      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ staticTemplateFallback: false })
      );
    });

    it('renders the template generation error below the check callout', async () => {
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
      mockUseCloudConnectorTemplate.mockReturnValue({
        launchButtonProps: { onClick: mockLaunchOnClick },
        isDisabled: false,
        isGeneratingTemplate: false,
        templateGenerationError: 'boom',
        isIacProvisionerEnabled: true,
      });

      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.IAC_CHECK_TEMPLATE_ERROR_CALLOUT
          )
        ).toBeInTheDocument();
      });
      expect(screen.getByText('boom')).toBeInTheDocument();
    });

    it('does not render the template generation error when there is no check callout', () => {
      mockVerifyResult({ matches: true, integrations: [] });
      mockUseCloudConnectorTemplate.mockReturnValue({
        launchButtonProps: { onClick: mockLaunchOnClick },
        isDisabled: false,
        isGeneratingTemplate: false,
        templateGenerationError: 'boom',
        isIacProvisionerEnabled: true,
      });

      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      expect(
        screen.queryByTestId(
          CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.IAC_CHECK_TEMPLATE_ERROR_CALLOUT
        )
      ).not.toBeInTheDocument();
    });
  });
});
