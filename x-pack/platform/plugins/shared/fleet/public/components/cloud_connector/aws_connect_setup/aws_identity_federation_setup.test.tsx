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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { SINGLE_ACCOUNT } from '../../../../common';
import { AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ } from '../../../../common/services/cloud_connectors/test_subjects';
import type { RenderIacTemplateIntegration } from '../../../../common/types/rest_spec/iac_provisioner';
import type { CloudConnectorIacState } from '../../../../common/types/models/cloud_connector';

import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';
import { useIacCallback } from '../hooks/use_iac_callback';
import type { IacCallbackCancelOutcome } from '../hooks/use_iac_callback';
import { IacKeyCheck } from '../components/iac_key_check';

import { AwsIdentityFederationSetup } from './aws_identity_federation_setup';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../hooks/use_get_cloud_connectors');
jest.mock('../hooks/use_cloud_connector_template');
jest.mock('../hooks/use_iac_callback');
jest.mock('../../../hooks', () => ({
  useDisabledIdentityFederationProviders: jest.fn(),
  useIacProvisioner: jest.fn(),
  useStartServices: jest.fn(),
}));
jest.mock('../components/iac_key_check', () => ({ IacKeyCheck: jest.fn() }));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseGetCloudConnectors = useGetCloudConnectors as jest.MockedFunction<
  typeof useGetCloudConnectors
>;
const mockUseCloudConnectorTemplate = useCloudConnectorTemplate as jest.MockedFunction<
  typeof useCloudConnectorTemplate
>;
const mockUseIacCallback = useIacCallback as jest.MockedFunction<typeof useIacCallback>;
const mockIacKeyCheck = IacKeyCheck as jest.MockedFunction<typeof IacKeyCheck>;
const {
  useIacProvisioner: mockUseIacProvisioner,
  useDisabledIdentityFederationProviders: mockUseDisabledIdentityFederationProviders,
} = jest.requireMock('../../../hooks') as {
  useIacProvisioner: jest.MockedFunction<() => { isIacProvisionerEnabled: boolean }>;
  useDisabledIdentityFederationProviders: jest.MockedFunction<() => readonly string[]>;
};

const STATIC_TEMPLATE_URL = 'https://console.aws.amazon.com/cloudformation/static';
// Template details the hook owns after a successful live render (key + blueprint), which Launch
// puts on the callback record as iac_key / iac_blueprint_*.
const RENDERED_IAC_CONFIRM: CloudConnectorIacState = {
  iac_key: 'sha256:abc',
  iac_blueprint_id: 'federated-identity',
  iac_blueprint_version: '1.0.0',
};

// Defaults re-applied in the top-level beforeEach: clearAllMocks resets calls, not implementations,
// so a test that swaps one of these in must not leak into the tests after it.
const defaultIacKeyCheckStub: React.FC<React.ComponentProps<typeof IacKeyCheck>> = () => (
  <div data-test-subj="mockIacKeyCheck" />
);
// Provisioner off: the hook hands back the static template link, as the old inline href did.
const staticTemplateHookResult: ReturnType<typeof useCloudConnectorTemplate> = {
  launchButtonProps: { href: STATIC_TEMPLATE_URL, target: '_blank' },
  isDisabled: false,
  isGeneratingTemplate: false,
  clearIacConfirm: jest.fn(),
  isIacProvisionerEnabled: false,
};
// Provisioner on: the hook launches through onClick and owns the render outcome
// (iacConfirm / templateGenerationError), which tests set via overrides.
const provisionerHookResult = (
  onClick: () => void,
  overrides: Partial<ReturnType<typeof useCloudConnectorTemplate>> = {}
): ReturnType<typeof useCloudConnectorTemplate> => ({
  launchButtonProps: {
    onClick: async () => {
      onClick();
    },
  },
  isDisabled: false,
  isGeneratingTemplate: false,
  clearIacConfirm: jest.fn(),
  isIacProvisionerEnabled: true,
  ...overrides,
});

const cloud = { isCloudEnabled: true } as unknown as React.ComponentProps<
  typeof AwsIdentityFederationSetup
>['cloud'];

const integrations: RenderIacTemplateIntegration[] = [
  { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
  { name: 'aws_logs', policyTemplates: [{ name: 'generic', enabledInputs: ['aws-s3'] }] },
];

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
  {
    id: 'connector-2',
    name: 'AWS Connector 2',
    cloudProvider: 'aws',
    accountType: SINGLE_ACCOUNT,
    vars: {
      role_arn: { value: 'arn:aws:iam::123456789012:role/Role2' },
      external_id: { value: 'external-id-2' },
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const lastIacKeyCheckProps = () => {
  const lastCall = mockIacKeyCheck.mock.calls[mockIacKeyCheck.mock.calls.length - 1];
  return lastCall?.[0] as React.ComponentProps<typeof IacKeyCheck> | undefined;
};

const lastReadyValue = (onReadyChange: jest.Mock) =>
  onReadyChange.mock.calls[onReadyChange.mock.calls.length - 1]?.[0];

describe('AwsIdentityFederationSetup', () => {
  let queryClient: QueryClient;
  const onConnectorIdChange = jest.fn();
  const onReadyChange = jest.fn();
  const mockLaunchOnClick = jest.fn();
  const mockCallbackStart = jest.fn();
  const mockCallbackCancel = jest.fn<Promise<IacCallbackCancelOutcome>, []>();
  const mockAddSuccess = jest.fn();

  const mockGetConnectors = (overrides: Partial<ReturnType<typeof useGetCloudConnectors>> = {}) => {
    mockUseGetCloudConnectors.mockReturnValue({
      data: mockCloudConnectors,
      isLoading: false,
      ...overrides,
    } as unknown as ReturnType<typeof useGetCloudConnectors>);
  };

  const setupElement = (
    props: Partial<React.ComponentProps<typeof AwsIdentityFederationSetup>> = {}
  ) => (
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

  const renderSetup = (
    props: Partial<React.ComponentProps<typeof AwsIdentityFederationSetup>> = {}
  ) => render(setupElement(props));

  /** Types the name Launch requires, which the stack's report will call the identity. */
  const typeIdentityName = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByTestId('awsIdentityFederationSetup-connectorName'), 'my-identity');
  };

  const expectNoManualEntry = () => {
    for (const testSubj of [
      'awsIdentityFederationSetup-stackArn',
      'awsIdentityFederationSetup-roleArn',
      'awsIdentityFederationSetup-createButton',
    ]) {
      expect(screen.queryByTestId(testSubj)).not.toBeInTheDocument();
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    mockUseKibana.mockReturnValue({
      services: {
        application: { navigateToApp: jest.fn() },
        notifications: { toasts: { addSuccess: mockAddSuccess } },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
    mockUseDisabledIdentityFederationProviders.mockReturnValue([]);
    mockCallbackCancel.mockResolvedValue('cancelled');
    mockUseIacCallback.mockReturnValue({
      available: false,
      status: 'idle',
      created: undefined,
      start: mockCallbackStart,
      cancel: mockCallbackCancel,
    });
    mockUseCloudConnectorTemplate.mockReset();
    mockUseCloudConnectorTemplate.mockReturnValue(staticTemplateHookResult);
    mockIacKeyCheck.mockReset();
    mockIacKeyCheck.mockImplementation(defaultIacKeyCheckStub);

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

  describe('without integrations (static template flow, as used by AwsConnectSetup)', () => {
    beforeEach(() => {
      // No connectors yet, so the New Identity tab is the initial tab.
      mockGetConnectors({ data: [] });
    });

    it('offers no ARN fields or Create with the provisioner off: the static stack reports back too', () => {
      mockUseIacCallback.mockReturnValue({
        available: true,
        status: 'idle',
        created: undefined,
        start: mockCallbackStart,
        cancel: mockCallbackCancel,
      });
      renderSetup({ cloud });

      expectNoManualEntry();
      expect(
        screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')
      ).toBeInTheDocument();
    });

    it('does not render IacKeyCheck on the Existing Identity tab', () => {
      mockGetConnectors();
      renderSetup({ initialConnectorId: 'connector-1' });

      expect(screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ)).toBeInTheDocument();
      expect(mockIacKeyCheck).not.toHaveBeenCalled();
      expect(screen.queryByTestId('mockIacKeyCheck')).not.toBeInTheDocument();
    });
  });

  describe('New Identity tab with integrations and the provisioner on', () => {
    beforeEach(() => {
      mockGetConnectors({ data: [] });
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockUseCloudConnectorTemplate.mockReturnValue(provisionerHookResult(mockLaunchOnClick));
      mockUseIacCallback.mockReturnValue({
        available: true,
        status: 'expired',
        created: undefined,
        start: mockCallbackStart,
        cancel: mockCallbackCancel,
      });
    });

    it('passes the integrations to the template hook and launches through its onClick', async () => {
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'aws', integrations })
      );

      // Launch needs the name the callback record will carry.
      await typeIdentityName(user);
      await user.click(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation'));
      expect(mockLaunchOnClick).toHaveBeenCalledTimes(1);
    });

    it('offers no Role ARN, stack ARN or Create: the stack reports the ARNs back itself', () => {
      renderSetup({ cloud, integrations });

      expectNoManualEntry();
    });

    it('renders the template generation error from the hook as a danger callout', () => {
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, { templateGenerationError: 'boom' })
      );

      renderSetup({ cloud, integrations });

      expect(screen.getByTestId('awsIdentityFederationSetup-templateError')).toBeInTheDocument();
      expect(screen.getByText('boom')).toBeInTheDocument();
    });
  });

  describe('CloudFormation callback (New Identity tab)', () => {
    const callbackState = (
      overrides: Partial<ReturnType<typeof useIacCallback>>
    ): ReturnType<typeof useIacCallback> => ({
      available: true,
      status: 'idle',
      created: undefined,
      start: mockCallbackStart,
      cancel: mockCallbackCancel,
      ...overrides,
    });

    beforeEach(() => {
      mockGetConnectors({ data: [] });
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockUseCloudConnectorTemplate.mockReturnValue(provisionerHookResult(mockLaunchOnClick));
      mockUseIacCallback.mockReturnValue(callbackState({}));
    });

    it('starts the callback at Launch with the typed name and the rendered template details', async () => {
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });
      await user.type(
        screen.getByTestId('awsIdentityFederationSetup-connectorName'),
        'my-identity'
      );

      expect(mockUseIacCallback).toHaveBeenCalledWith({ enabled: true });
      const { getLaunchStackParams } = mockUseCloudConnectorTemplate.mock.lastCall![0];
      await act(async () => {
        await getLaunchStackParams?.(RENDERED_IAC_CONFIRM);
      });

      expect(mockCallbackStart).toHaveBeenCalledWith({
        connectorName: 'my-identity',
        accountType: 'single-account',
        iacKey: 'sha256:abc',
        iacBlueprintId: 'federated-identity',
        iacBlueprintVersion: '1.0.0',
      });
    });

    it('starts the callback without template details for a static launch with the provisioner off', async () => {
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
      const user = userEvent.setup();
      renderSetup({ cloud });
      await user.type(
        screen.getByTestId('awsIdentityFederationSetup-connectorName'),
        'my-identity'
      );

      expect(mockUseIacCallback).toHaveBeenCalledWith({ enabled: true });
      const { getLaunchStackParams } = mockUseCloudConnectorTemplate.mock.lastCall![0];
      await act(async () => {
        await getLaunchStackParams?.(undefined);
      });

      expect(mockCallbackStart).toHaveBeenCalledWith({
        connectorName: 'my-identity',
        accountType: 'single-account',
      });
    });

    it('does not pass getLaunchStackParams to the template hook when the callback is not available', () => {
      mockUseIacCallback.mockReturnValue(callbackState({ available: false }));
      renderSetup({ cloud, integrations });

      expect(mockUseCloudConnectorTemplate.mock.lastCall![0].getLaunchStackParams).toBeUndefined();
    });

    it('explains and blocks Launch when the callback is not available: nothing else creates the identity', async () => {
      mockUseIacCallback.mockReturnValue(callbackState({ available: false }));
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      expect(
        screen.getByTestId('awsIdentityFederationSetup-callbackUnavailable')
      ).toBeInTheDocument();
      await typeIdentityName(user);
      expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeDisabled();
      expectNoManualEntry();
    });

    it('does not show the unavailable callout when the callback is available', () => {
      renderSetup({ cloud, integrations });

      expect(
        screen.queryByTestId('awsIdentityFederationSetup-callbackUnavailable')
      ).not.toBeInTheDocument();
    });

    it('disables the callback when AWS identity federation is off', () => {
      mockUseDisabledIdentityFederationProviders.mockReturnValue(['aws']);
      renderSetup({ cloud, integrations });

      expect(mockUseIacCallback).toHaveBeenCalledWith({ enabled: false });
    });

    it('shows a spinner with a waiting hint while the stack has not called back yet', () => {
      mockUseIacCallback.mockReturnValue(callbackState({ status: 'pending' }));
      renderSetup({ cloud, integrations });

      expect(screen.getByTestId('awsIdentityFederationSetup-callbackPending')).toBeInTheDocument();
      expect(screen.getByTestId('awsIdentityFederationSetup-callbackSpinner')).toBeInTheDocument();
    });

    it.each(['idle', 'received', 'expired', 'error'] as const)(
      'shows no spinner when the callback is %s',
      (status) => {
        mockUseIacCallback.mockReturnValue(callbackState({ status }));
        renderSetup({ cloud, integrations });

        expect(
          screen.queryByTestId('awsIdentityFederationSetup-callbackSpinner')
        ).not.toBeInTheDocument();
      }
    );

    it('names the identity the stack will create in the waiting hint', async () => {
      const user = userEvent.setup();
      const { rerender } = renderSetup({ cloud, integrations });
      await user.type(
        screen.getByTestId('awsIdentityFederationSetup-connectorName'),
        'my-identity'
      );
      const { getLaunchStackParams } = mockUseCloudConnectorTemplate.mock.lastCall![0];
      await act(async () => {
        await getLaunchStackParams?.(RENDERED_IAC_CONFIRM);
      });
      mockUseIacCallback.mockReturnValue(callbackState({ status: 'pending' }));
      rerender(setupElement({ cloud, integrations }));

      expect(screen.getByTestId('awsIdentityFederationSetup-callbackPending')).toHaveTextContent(
        'create the federated identity my-identity'
      );
      // Renaming afterwards does not change what the stack reports.
      await user.type(screen.getByTestId('awsIdentityFederationSetup-connectorName'), '-2');
      expect(screen.getByTestId('awsIdentityFederationSetup-callbackPending')).toHaveTextContent(
        'create the federated identity my-identity.'
      );
    });

    it('needs a name before Launch when the stack can report back', async () => {
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeDisabled();
      await user.type(
        screen.getByTestId('awsIdentityFederationSetup-connectorName'),
        'my-identity'
      );
      expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeEnabled();
    });

    it('shows the success toast, selects the identity the stack created and hands it to IacKeyCheck', async () => {
      const clearIacConfirm = jest.fn();
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, {
          iacConfirm: RENDERED_IAC_CONFIRM,
          clearIacConfirm,
        })
      );
      mockUseIacCallback.mockReturnValue(
        callbackState({
          status: 'received',
          created: { id: 'cc-1', name: 'my-identity' },
        })
      );
      renderSetup({ cloud, integrations });

      expect(mockAddSuccess).toHaveBeenCalledWith({
        title: 'Federated identity created successfully',
      });
      expect(onConnectorIdChange).toHaveBeenCalledWith('cc-1', 'my-identity');
      expect(
        screen.queryByTestId('awsIdentityFederationSetup-callbackPending')
      ).not.toBeInTheDocument();
      // Lands on the Existing tab with the new identity selected and under check; the template
      // details of the launch belong to that identity now.
      await waitFor(() => {
        expect(lastIacKeyCheckProps()?.cloudConnectorId).toBe('cc-1');
      });
      expect(clearIacConfirm).toHaveBeenCalledTimes(1);
    });

    it('clears the name once the stack created the identity', async () => {
      const user = userEvent.setup();
      const { rerender } = renderSetup({ cloud, integrations });
      await typeIdentityName(user);

      mockUseIacCallback.mockReturnValue(
        callbackState({ status: 'received', created: { id: 'cc-1', name: 'my-identity' } })
      );
      rerender(setupElement({ cloud, integrations }));

      await user.click(screen.getByRole('tab', { name: 'New Identity' }));
      expect(screen.getByTestId('awsIdentityFederationSetup-connectorName')).toHaveValue('');
    });

    it('keeps the name editable and Launch available while waiting, so the user can launch again', () => {
      mockUseIacCallback.mockReturnValue(callbackState({ status: 'pending' }));
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, {
          iacConfirm: RENDERED_IAC_CONFIRM,
          hasLaunched: true,
        })
      );
      renderSetup({ cloud, integrations });

      expect(screen.getByTestId('awsIdentityFederationSetup-connectorName')).toBeEnabled();
      expect(
        screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')
      ).toBeInTheDocument();
      expect(screen.getByTestId('awsIdentityFederationSetup-callbackSpinner')).toBeInTheDocument();
    });

    it('shows the spinner while waiting on a static launch with the provisioner off', () => {
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
      mockUseIacCallback.mockReturnValue(callbackState({ status: 'pending' }));
      mockUseCloudConnectorTemplate.mockReturnValue({
        ...staticTemplateHookResult,
        hasLaunched: true,
      });
      renderSetup({ cloud });

      expect(screen.getByTestId('awsIdentityFederationSetup-callbackSpinner')).toBeInTheDocument();
    });

    it.each(['expired', 'error'] as const)(
      'asks for another launch, without a spinner, when the callback is %s',
      async (status) => {
        mockUseIacCallback.mockReturnValue(callbackState({ status }));
        const user = userEvent.setup();
        renderSetup({ cloud, integrations });

        expect(
          screen.getByTestId('awsIdentityFederationSetup-callbackGivenUp')
        ).toBeInTheDocument();
        expect(
          screen.queryByTestId('awsIdentityFederationSetup-callbackPending')
        ).not.toBeInTheDocument();
        expectNoManualEntry();
        await typeIdentityName(user);
        expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeEnabled();
      }
    );

    it('keeps waiting after a static-template fallback', () => {
      mockUseIacCallback.mockReturnValue(callbackState({ status: 'pending' }));
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, {
          iacConfirm: { iac_key: null, iac_blueprint_id: null, iac_blueprint_version: null },
          hasLaunched: true,
        })
      );
      renderSetup({ cloud, integrations });

      expect(mockCallbackCancel).not.toHaveBeenCalled();
    });

    it('retires the record when the launch failed', () => {
      mockUseIacCallback.mockReturnValue(callbackState({ status: 'pending' }));
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, { templateGenerationError: 'boom' })
      );
      renderSetup({ cloud, integrations });

      expect(mockCallbackCancel).toHaveBeenCalled();
    });

    it('keeps waiting on a rendered launch', () => {
      mockUseIacCallback.mockReturnValue(callbackState({ status: 'pending' }));
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, {
          iacConfirm: RENDERED_IAC_CONFIRM,
          hasLaunched: true,
        })
      );
      renderSetup({ cloud, integrations });

      expect(mockCallbackCancel).not.toHaveBeenCalled();
    });
  });

  describe('Existing Identity tab with integrations', () => {
    beforeEach(() => {
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
    });

    it('lets IacKeyCheck write the rendered key itself when no template-recorded callback is given', () => {
      renderSetup({ cloud, integrations, initialConnectorId: 'connector-1' });

      const props = lastIacKeyCheckProps();
      expect(props).not.toHaveProperty('writeOnRender');
      expect(props).not.toHaveProperty('onTemplateRecorded');
    });

    it('turns off the click-time write and forwards the template details when onIacTemplateRecorded is given', () => {
      // The onboarding stores the key after Deploy succeeds, so a launch the user never applies
      // leaves the connector untouched.
      const onIacTemplateRecorded = jest.fn();
      renderSetup({
        cloud,
        integrations,
        initialConnectorId: 'connector-1',
        onIacTemplateRecorded,
      });

      const props = lastIacKeyCheckProps();
      expect(props?.writeOnRender).toBe(false);
      expect(props?.onTemplateRecorded).toBe(onIacTemplateRecorded);
    });

    it('becomes ready once the check reports the launch, while its verdict is still key_mismatch', async () => {
      // IacKeyCheck reports validity, not the raw verdict: after the user launches the update it
      // reports true even though the deployed template has not been re-checked ("let them finish").
      const onIacTemplateRecorded = jest.fn();
      renderSetup({
        cloud,
        integrations,
        initialConnectorId: 'connector-1',
        onIacTemplateRecorded,
      });
      await waitFor(() => expect(onReadyChange).toHaveBeenCalled());

      act(() => {
        lastIacKeyCheckProps()?.onValidityChange?.(false);
      });
      expect(lastReadyValue(onReadyChange)).toBe(false);

      // The launch: the check hands the template details to the host and lifts its block.
      act(() => {
        lastIacKeyCheckProps()?.onTemplateRecorded?.(
          {
            iac_key: 'sha256:new',
            iac_blueprint_id: 'federated-identity',
            iac_blueprint_version: '1.0.0',
          },
          { cloudConnectorId: 'connector-1', integrations }
        );
        lastIacKeyCheckProps()?.onValidityChange?.(true);
      });

      expect(onIacTemplateRecorded).toHaveBeenCalledWith(
        {
          iac_key: 'sha256:new',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        },
        { cloudConnectorId: 'connector-1', integrations }
      );
      expect(lastReadyValue(onReadyChange)).toBe(true);
    });

    it('starts not ready while the check is pending and follows the verdicts it reports', async () => {
      // Readiness starts pessimistic exactly when a check will run, so Deploy/Save cannot be
      // pressed during the verify round-trip.
      renderSetup({ cloud, integrations, initialConnectorId: 'connector-1' });
      await waitFor(() => expect(onReadyChange).toHaveBeenCalled());
      expect(onReadyChange).not.toHaveBeenCalledWith(true);
      expect(lastReadyValue(onReadyChange)).toBe(false);

      act(() => {
        lastIacKeyCheckProps()?.onValidityChange?.(true);
      });
      expect(lastReadyValue(onReadyChange)).toBe(true);

      act(() => {
        lastIacKeyCheckProps()?.onValidityChange?.(false);
      });
      expect(lastReadyValue(onReadyChange)).toBe(false);
    });

    it('starts ready when integrations are given but the provisioner is off (no check runs)', () => {
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });

      renderSetup({ cloud, integrations, initialConnectorId: 'connector-1' });

      expect(onReadyChange).toHaveBeenCalledWith(true);
    });

    it('starts ready when the provisioner is on but there are no integrations (no check runs)', () => {
      renderSetup({ cloud, initialConnectorId: 'connector-1' });

      expect(onReadyChange).toHaveBeenCalledWith(true);
    });

    it('goes back to not ready when a different connector is selected, until its own check reports', async () => {
      const user = userEvent.setup();
      renderSetup({ cloud, integrations, initialConnectorId: 'connector-1' });
      await waitFor(() => expect(onReadyChange).toHaveBeenCalled());

      act(() => {
        lastIacKeyCheckProps()?.onValidityChange?.(true);
      });
      expect(lastReadyValue(onReadyChange)).toBe(true);

      await user.click(screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ));
      await user.click(await screen.findByText('AWS Connector 2'));

      await waitFor(() => {
        expect(lastIacKeyCheckProps()?.cloudConnectorId).toBe('connector-2');
      });
      // connector-1's verdict says nothing about connector-2: not ready until its check reports,
      // rather than re-enabling Deploy for the round-trip.
      expect(lastReadyValue(onReadyChange)).toBe(false);

      act(() => {
        lastIacKeyCheckProps()?.onValidityChange?.(true);
      });
      expect(lastReadyValue(onReadyChange)).toBe(true);
    });

    it('goes back to not ready when the integration set changes, until the new check reports', async () => {
      const widerIntegrations: RenderIacTemplateIntegration[] = [
        ...integrations,
        { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['httpjson'] }] },
      ];
      const { rerender } = renderSetup({ cloud, integrations, initialConnectorId: 'connector-1' });
      await waitFor(() => expect(onReadyChange).toHaveBeenCalled());

      act(() => {
        lastIacKeyCheckProps()?.onValidityChange?.(true);
      });
      expect(lastReadyValue(onReadyChange)).toBe(true);

      // The onboarding does not remount this component when the user widens the selection; the
      // previous set's verdict must not keep Deploy enabled while the remounted check is pending.
      rerender(
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <AwsIdentityFederationSetup
              onReadyChange={onReadyChange}
              onConnectorIdChange={onConnectorIdChange}
              cloud={cloud}
              integrations={widerIntegrations}
              initialConnectorId="connector-1"
            />
          </QueryClientProvider>
        </I18nProvider>
      );
      await waitFor(() => {
        expect(lastIacKeyCheckProps()?.integrations).toBe(widerIntegrations);
      });
      expect(lastReadyValue(onReadyChange)).toBe(false);

      act(() => {
        lastIacKeyCheckProps()?.onValidityChange?.(true);
      });
      expect(lastReadyValue(onReadyChange)).toBe(true);
    });

    it('remounts IacKeyCheck when the integration set changes, so its verdict and launched state start fresh', async () => {
      // A set widened after Launch must block again; the remount also re-runs the check.
      let mounts = 0;
      mockIacKeyCheck.mockImplementation(() => {
        React.useEffect(() => {
          mounts += 1;
        }, []);
        return <div data-test-subj="mockIacKeyCheck" />;
      });
      const { rerender } = renderSetup({ cloud, integrations, initialConnectorId: 'connector-1' });
      await waitFor(() => expect(mounts).toBe(1));

      // Same content, new array identity: no remount.
      rerender(
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <AwsIdentityFederationSetup
              onReadyChange={onReadyChange}
              onConnectorIdChange={onConnectorIdChange}
              cloud={cloud}
              integrations={JSON.parse(JSON.stringify(integrations))}
              initialConnectorId="connector-1"
            />
          </QueryClientProvider>
        </I18nProvider>
      );
      expect(mounts).toBe(1);

      // A wider set: remount.
      rerender(
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <AwsIdentityFederationSetup
              onReadyChange={onReadyChange}
              onConnectorIdChange={onConnectorIdChange}
              cloud={cloud}
              integrations={[
                ...integrations,
                {
                  name: 'aws',
                  policyTemplates: [{ name: 'guardduty', enabledInputs: ['httpjson'] }],
                },
              ]}
              initialConnectorId="connector-1"
            />
          </QueryClientProvider>
        </I18nProvider>
      );
      await waitFor(() => expect(mounts).toBe(2));
    });

    it('keeps blocking when the newly selected connector reports invalid as soon as it mounts', async () => {
      // A connector whose verdict is already cached reports in its mount effect, which runs
      // before any parent effect: the parent's reset must not overwrite that fresh verdict.
      mockIacKeyCheck.mockImplementation(({ cloudConnectorId, onValidityChange }) => {
        React.useEffect(() => {
          onValidityChange?.(false);
        }, [cloudConnectorId, onValidityChange]);
        return <div data-test-subj="mockIacKeyCheck" />;
      });
      const user = userEvent.setup();
      renderSetup({ cloud, integrations, initialConnectorId: 'connector-1' });
      await waitFor(() => expect(lastReadyValue(onReadyChange)).toBe(false));

      await user.click(screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ));
      await user.click(await screen.findByText('AWS Connector 2'));

      await waitFor(() => {
        expect(lastIacKeyCheckProps()?.cloudConnectorId).toBe('connector-2');
      });
      expect(lastReadyValue(onReadyChange)).toBe(false);
    });
  });
});
