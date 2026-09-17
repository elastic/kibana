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
import {
  useCloudConnectorTemplate,
  type TemplateRendered,
} from '../hooks/use_cloud_connector_template';

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
const mockReportEvent = jest.fn();

const integrations: RenderIacTemplateIntegration[] = [
  { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
  { name: 'aws_logs', policyTemplates: [{ name: 'generic', enabledInputs: ['aws-s3'] }] },
];

const mockVerifyResult = (data: unknown) =>
  mockUseVerifyIacKey.mockReturnValue({
    data,
  } as unknown as ReturnType<typeof useVerifyIacKey>);

const defaultProps = {
  cloudConnectorId: 'connector-1',
  integrations,
};

// Blueprint details the hook reports with every rendered key.
const RENDERED_BLUEPRINT = { blueprintId: 'federated-identity', blueprintVersion: '1.0.0' };

// ---------- shared before/after ----------

beforeEach(() => {
  jest.clearAllMocks();

  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
  useStartServices.mockReturnValue({ analytics: { reportEvent: mockReportEvent }, http: mockHttp });

  mockUseVerifyIacKey.mockReturnValue({
    data: undefined,
    isSuccess: false,
    isError: false,
    isLoading: false,
  } as unknown as ReturnType<typeof useVerifyIacKey>);

  mockUseCloudConnectorTemplate.mockReturnValue({
    launchButtonProps: { onClick: mockLaunchOnClick },
    isDisabled: false,
    isGeneratingTemplate: false,
    clearIacConfirm: jest.fn(),
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

    it('renders the callout on no_key and blocks, like a mismatch', async () => {
      // A missing key means the deployed template is not known to cover the selection.
      mockVerifyResult({ matches: false, reason: 'no_key', integrations: [] });
      const onValidityChange = jest.fn();

      renderWithIntl(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />);

      await waitFor(() => {
        expect(
          screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT)
        ).toBeInTheDocument();
      });
      expect(onValidityChange).toHaveBeenCalledWith(false);
      expect(onValidityChange).not.toHaveBeenCalledWith(true);
    });

    it('pluralises the callout copy from the number of integrations the check covers', async () => {
      // The onboarding checks a package set, not one titled integration: two → "these integrations".
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });

      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      await waitFor(() => expect(screen.getByText('these integrations')).toBeInTheDocument());
    });

    it('fails open on a query error: no callout, reports valid', () => {
      mockUseVerifyIacKey.mockReturnValue({
        data: undefined,
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
    const pendingFirstCheck = () =>
      mockUseVerifyIacKey.mockReturnValue({
        data: undefined,
        isInitialLoading: true,
      } as unknown as ReturnType<typeof useVerifyIacKey>);

    it('says nothing while the first check is pending, then reports valid once the template matches', async () => {
      // Neither verdict is backed yet: "valid" would enable Save/Deploy for the round-trip, and
      // "invalid" would hand extension hosts (which only forward a block) a false they cannot
      // clear.
      pendingFirstCheck();
      const onValidityChange = jest.fn();

      const { rerender } = renderWithIntl(
        <IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />
      );
      expect(onValidityChange).not.toHaveBeenCalled();

      mockVerifyResult({ matches: true, outcome: 'matches', integrations: [] });
      rerender(
        withProviders(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />)
      );
      await waitFor(() => expect(onValidityChange).toHaveBeenCalledWith(true));
      expect(onValidityChange).toHaveBeenCalledTimes(1);
    });

    it('reports invalid once, when the pending check resolves to key_mismatch', async () => {
      pendingFirstCheck();
      const onValidityChange = jest.fn();

      const { rerender } = renderWithIntl(
        <IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />
      );
      expect(onValidityChange).not.toHaveBeenCalled();

      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
      rerender(
        withProviders(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />)
      );
      await screen.findByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.CALLOUT);
      expect(onValidityChange).toHaveBeenCalledTimes(1);
      expect(onValidityChange).toHaveBeenCalledWith(false);
    });

    it('reports valid once a pending check fails open', async () => {
      pendingFirstCheck();
      const onValidityChange = jest.fn();

      const { rerender } = renderWithIntl(
        <IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />
      );
      expect(onValidityChange).not.toHaveBeenCalled();

      mockVerifyResult({ matches: true, outcome: 'key_unavailable', integrations: [] });
      rerender(
        withProviders(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />)
      );
      await waitFor(() => expect(onValidityChange).toHaveBeenCalledWith(true));
      expect(onValidityChange).toHaveBeenCalledTimes(1);
    });

    it('reports nothing while pending even when the check is disabled', () => {
      useIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
      pendingFirstCheck();
      const onValidityChange = jest.fn();

      renderWithIntl(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />);

      expect(onValidityChange).not.toHaveBeenCalled();
    });

    it('reports only when the blocking state changes, not when the callback identity changes', async () => {
      // A host may re-create onValidityChange after every state update; re-firing on identity
      // would loop: report → update → new callback → report …
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });

      const first = jest.fn();
      const { rerender } = renderWithIntl(
        <IacKeyCheck {...defaultProps} onValidityChange={first} />
      );
      await waitFor(() => expect(first).toHaveBeenCalledWith(false));
      expect(first).toHaveBeenCalledTimes(1);

      // Same blocking state, new callback identity (what a host does after each state update).
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
          surface: 'onboarding',
          action: 'update_stack_clicked',
          reason: 'key_mismatch',
          hasDeploymentId: false,
        })
      );
      expect(mockLaunchOnClick).toHaveBeenCalledTimes(1);
    });

    it('onTemplateRendered stores the key, invalidates both query keys, and does not toast', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      let capturedOnTemplateRendered: ((r: TemplateRendered) => void) | undefined;
      mockUseCloudConnectorTemplate.mockImplementation(({ onTemplateRendered }) => {
        capturedOnTemplateRendered = onTemplateRendered;
        return {
          launchButtonProps: { onClick: mockLaunchOnClick },
          isDisabled: false,
          isGeneratingTemplate: false,
          clearIacConfirm: jest.fn(),
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
        capturedOnTemplateRendered?.({
          key: 'sha256:new',
          integrations: [],
          ...RENDERED_BLUEPRINT,
        });
      });

      expect(mockUpdateCloudConnector).toHaveBeenCalledWith(mockHttp, 'connector-1', {
        iac_key: 'sha256:new',
        iac_blueprint_id: 'federated-identity',
        iac_blueprint_version: '1.0.0',
      });
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith(['get-cloud-connectors']);
        expect(invalidateQueriesSpy).toHaveBeenCalledWith(['cloud-connector-usage', 'connector-1']);
      });
      // The optimistic write uses the raw request helper — no success toast should fire.
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });

    it('onTemplateRendered without a key writes nothing', async () => {
      let capturedOnTemplateRendered: ((r: TemplateRendered) => void) | undefined;
      mockUseCloudConnectorTemplate.mockImplementation(({ onTemplateRendered }) => {
        capturedOnTemplateRendered = onTemplateRendered;
        return {
          launchButtonProps: { onClick: mockLaunchOnClick },
          isDisabled: false,
          isGeneratingTemplate: false,
          clearIacConfirm: jest.fn(),
          isIacProvisionerEnabled: true,
        };
      });

      renderWithIntl(<IacKeyCheck {...defaultProps} />);

      // An empty key exercises the `if (key && cloudConnectorId)` guard.
      await act(async () => {
        capturedOnTemplateRendered?.({ key: '', integrations: [], ...RENDERED_BLUEPRINT });
      });

      expect(mockUpdateCloudConnector).not.toHaveBeenCalled();
    });
  });

  describe('launching the update ("let them finish")', () => {
    // Captures the hook's onTemplateRendered so a test can stand in for a successful render.
    const captureOnTemplateRendered = () => {
      let captured: ((r: TemplateRendered) => void) | undefined;
      mockUseCloudConnectorTemplate.mockImplementation(({ onTemplateRendered }) => {
        captured = onTemplateRendered;
        return {
          launchButtonProps: { onClick: mockLaunchOnClick },
          isDisabled: false,
          isGeneratingTemplate: false,
          clearIacConfirm: jest.fn(),
          isIacProvisionerEnabled: true,
        };
      });
      return () => captured;
    };
    const rendered: TemplateRendered = {
      key: 'sha256:new',
      integrations: [],
      ...RENDERED_BLUEPRINT,
    };

    it('lifts the block once the update is launched, while the verdict is still key_mismatch', async () => {
      // Kibana cannot see the user apply the update in AWS, so the launch is what unblocks
      // Deploy.
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
      const getOnTemplateRendered = captureOnTemplateRendered();
      const onValidityChange = jest.fn();

      renderWithIntl(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />);
      await waitFor(() => expect(onValidityChange).toHaveBeenCalledWith(false));

      await act(async () => {
        getOnTemplateRendered()?.(rendered);
      });

      await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(true));
      expect(onValidityChange).toHaveBeenCalledTimes(2);
    });

    it('switches the callout to its launched state and keeps Update available', async () => {
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
      const getOnTemplateRendered = captureOnTemplateRendered();

      renderWithIntl(<IacKeyCheck {...defaultProps} />);
      await screen.findByText('CloudFormation stack update required');

      await act(async () => {
        getOnTemplateRendered()?.(rendered);
      });

      expect(await screen.findByText('CloudFormation stack update opened')).toBeInTheDocument();
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.UPDATE_STACK_BUTTON)
      ).toBeEnabled();
    });

    it('forgets the launch when the connector changes: the new identity is blocked again', async () => {
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
      const getOnTemplateRendered = captureOnTemplateRendered();
      const onValidityChange = jest.fn();

      const { rerender } = renderWithIntl(
        <IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />
      );
      await act(async () => {
        getOnTemplateRendered()?.(rendered);
      });
      await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(true));

      rerender(
        withProviders(
          <IacKeyCheck
            {...defaultProps}
            cloudConnectorId="connector-2"
            onValidityChange={onValidityChange}
          />
        )
      );

      await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(false));
      expect(screen.getByText('CloudFormation stack update required')).toBeInTheDocument();
    });

    it('does not lift the block when the render produced no key', async () => {
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
      const getOnTemplateRendered = captureOnTemplateRendered();
      const onValidityChange = jest.fn();

      renderWithIntl(<IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />);
      await waitFor(() => expect(onValidityChange).toHaveBeenCalledWith(false));

      await act(async () => {
        getOnTemplateRendered()?.({ ...rendered, key: '' });
      });

      expect(onValidityChange).not.toHaveBeenCalledWith(true);
    });

    it('forgets the launch when the integration set changes: a set widened after Launch blocks again', async () => {
      // The template was rendered for the set at click time; a wider set is not covered by it.
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
      const getOnTemplateRendered = captureOnTemplateRendered();
      const onValidityChange = jest.fn();

      const { rerender } = renderWithIntl(
        <IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />
      );
      await act(async () => {
        getOnTemplateRendered()?.(rendered);
      });
      await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(true));
      expect(await screen.findByText('CloudFormation stack update opened')).toBeInTheDocument();

      rerender(
        withProviders(
          <IacKeyCheck
            {...defaultProps}
            integrations={[
              ...integrations,
              {
                name: 'aws',
                policyTemplates: [{ name: 'guardduty', enabledInputs: ['httpjson'] }],
              },
            ]}
            onValidityChange={onValidityChange}
          />
        )
      );

      await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(false));
      expect(screen.getByText('CloudFormation stack update required')).toBeInTheDocument();
      expect(screen.queryByText('CloudFormation stack update opened')).not.toBeInTheDocument();
    });

    it('keeps the launch when the integration set is re-created with the same content', async () => {
      // Hosts rebuild the array on every render; only a real change of content resets the launch.
      mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
      const getOnTemplateRendered = captureOnTemplateRendered();
      const onValidityChange = jest.fn();

      const { rerender } = renderWithIntl(
        <IacKeyCheck {...defaultProps} onValidityChange={onValidityChange} />
      );
      await act(async () => {
        getOnTemplateRendered()?.(rendered);
      });
      await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(true));

      rerender(
        withProviders(
          <IacKeyCheck
            {...defaultProps}
            integrations={JSON.parse(JSON.stringify(integrations))}
            onValidityChange={onValidityChange}
          />
        )
      );

      expect(onValidityChange).toHaveBeenCalledTimes(2);
      expect(screen.getByText('CloudFormation stack update opened')).toBeInTheDocument();
    });

    describe('writeOnRender={false}', () => {
      it('hands the template details to the host instead of writing the connector', async () => {
        mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
        const getOnTemplateRendered = captureOnTemplateRendered();
        const onTemplateRecorded = jest.fn();
        const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

        renderWithIntl(
          <IacKeyCheck
            {...defaultProps}
            writeOnRender={false}
            onTemplateRecorded={onTemplateRecorded}
          />
        );

        await act(async () => {
          getOnTemplateRendered()?.(rendered);
        });

        expect(onTemplateRecorded).toHaveBeenCalledTimes(1);
        // Tagged with the identity the update was launched for: the host may have selected
        // another one by the time the asynchronous render lands.
        expect(onTemplateRecorded).toHaveBeenCalledWith(
          {
            iac_key: 'sha256:new',
            iac_blueprint_id: 'federated-identity',
            iac_blueprint_version: '1.0.0',
          },
          'connector-1'
        );
        expect(mockUpdateCloudConnector).not.toHaveBeenCalled();
        expect(invalidateQueriesSpy).not.toHaveBeenCalled();
      });

      it('still lifts the block and shows the launched state', async () => {
        mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
        const getOnTemplateRendered = captureOnTemplateRendered();
        const onValidityChange = jest.fn();

        renderWithIntl(
          <IacKeyCheck
            {...defaultProps}
            writeOnRender={false}
            onTemplateRecorded={jest.fn()}
            onValidityChange={onValidityChange}
          />
        );
        await waitFor(() => expect(onValidityChange).toHaveBeenCalledWith(false));

        await act(async () => {
          getOnTemplateRendered()?.(rendered);
        });

        await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(true));
        expect(await screen.findByText('CloudFormation stack update opened')).toBeInTheDocument();
      });

      it('uses the latest callback the host passed', async () => {
        mockVerifyResult({ matches: false, reason: 'key_mismatch', integrations: [] });
        const getOnTemplateRendered = captureOnTemplateRendered();
        const first = jest.fn();
        const second = jest.fn();

        const { rerender } = renderWithIntl(
          <IacKeyCheck {...defaultProps} writeOnRender={false} onTemplateRecorded={first} />
        );
        rerender(
          withProviders(
            <IacKeyCheck {...defaultProps} writeOnRender={false} onTemplateRecorded={second} />
          )
        );

        await act(async () => {
          getOnTemplateRendered()?.(rendered);
        });

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
      });
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
        clearIacConfirm: jest.fn(),
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
        clearIacConfirm: jest.fn(),
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
