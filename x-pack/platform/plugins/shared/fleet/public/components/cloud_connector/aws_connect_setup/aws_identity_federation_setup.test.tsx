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
import { useProvisioningCallback } from '../hooks/use_provisioning_callback';
import type { ProvisioningCallbackCancelOutcome } from '../hooks/use_provisioning_callback';
import { useCreateCloudConnector } from '../hooks/use_create_cloud_connector';
import { IacKeyCheck } from '../components/iac_key_check';
import { INVALID_STACK_ARN_MESSAGE } from '../utils';

import { AwsIdentityFederationSetup } from './aws_identity_federation_setup';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../hooks/use_get_cloud_connectors');
jest.mock('../hooks/use_cloud_connector_template');
jest.mock('../hooks/use_provisioning_callback');
jest.mock('../hooks/use_create_cloud_connector');
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
const mockUseProvisioningCallback = useProvisioningCallback as jest.MockedFunction<
  typeof useProvisioningCallback
>;
const mockUseCreateCloudConnector = useCreateCloudConnector as jest.MockedFunction<
  typeof useCreateCloudConnector
>;
const mockIacKeyCheck = IacKeyCheck as jest.MockedFunction<typeof IacKeyCheck>;
const {
  useIacProvisioner: mockUseIacProvisioner,
  useDisabledIdentityFederationProviders: mockUseDisabledIdentityFederationProviders,
} = jest.requireMock('../../../hooks') as {
  useIacProvisioner: jest.MockedFunction<() => { isIacProvisionerEnabled: boolean }>;
  useDisabledIdentityFederationProviders: jest.MockedFunction<() => readonly string[]>;
};

const STATIC_TEMPLATE_URL = 'https://console.aws.amazon.com/cloudformation/static';
const VALID_STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/abc';
const REPORTED_ROLE_ARN = 'arn:aws:iam::123456789012:role/ElasticWorkloadIdentity-abc';
const NEW_ROLE_ARN = 'arn:aws:iam::123456789012:role/NewRole';
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
  const mockMutate = jest.fn();
  const mockLaunchOnClick = jest.fn();
  const mockCallbackStart = jest.fn();
  const mockCallbackCancel = jest.fn<Promise<ProvisioningCallbackCancelOutcome>, []>();
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();

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

  /** Fills the fields a manual Create requires. */
  const fillRequiredNewIdentityFields = async (user: ReturnType<typeof userEvent.setup>) => {
    await typeIdentityName(user);
    await user.type(screen.getByTestId('awsIdentityFederationSetup-roleArn'), NEW_ROLE_ARN);
  };

  /** The ARN fields can be typed in; Create is only held back by its own validation. */
  const expectManualEntryUnlocked = () => {
    expect(screen.getByTestId('awsIdentityFederationSetup-stackArn')).not.toHaveAttribute(
      'readonly'
    );
    expect(screen.getByTestId('awsIdentityFederationSetup-roleArn')).not.toHaveAttribute(
      'readonly'
    );
    expect(screen.getByTestId('awsIdentityFederationSetup-createButton')).toBeInTheDocument();
  };

  /** The ARN fields only show values; Create cannot be pressed. */
  const expectManualEntryLocked = () => {
    expect(screen.getByTestId('awsIdentityFederationSetup-stackArn')).toHaveAttribute('readonly');
    expect(screen.getByTestId('awsIdentityFederationSetup-roleArn')).toHaveAttribute('readonly');
    expect(screen.getByTestId('awsIdentityFederationSetup-createButton')).toBeDisabled();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    mockUseKibana.mockReturnValue({
      services: {
        application: { navigateToApp: jest.fn() },
        notifications: { toasts: { addSuccess: mockAddSuccess, addDanger: mockAddDanger } },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseCreateCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useCreateCloudConnector>);

    mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
    mockUseDisabledIdentityFederationProviders.mockReturnValue([]);
    mockCallbackCancel.mockResolvedValue('cancelled');
    mockUseProvisioningCallback.mockReturnValue({
      available: false,
      isChecking: false,
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
  });

  describe('without integrations (static template flow, as used by AwsConnectSetup)', () => {
    beforeEach(() => {
      // No connectors yet, so the New Identity tab is the initial tab.
      mockGetConnectors({ data: [] });
    });

    it('renders the ARN fields and Create with the provisioner off, so the identity can be created by hand', () => {
      mockUseProvisioningCallback.mockReturnValue({
        available: true,
        isChecking: false,
        status: 'idle',
        created: undefined,
        start: mockCallbackStart,
        cancel: mockCallbackCancel,
      });
      renderSetup({ cloud });

      expectManualEntryUnlocked();
      expect(
        screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')
      ).toBeInTheDocument();
    });

    it('posts the plain create body without IaC fields', async () => {
      const user = userEvent.setup();
      renderSetup({ cloud });

      await fillRequiredNewIdentityFields(user);
      await user.click(screen.getByTestId('awsIdentityFederationSetup-createButton'));

      expect(mockMutate).toHaveBeenCalledWith({
        name: 'my-identity',
        cloudProvider: 'aws',
        accountType: 'single-account',
        vars: {
          role_arn: { value: NEW_ROLE_ARN, type: 'text' },
        },
      });
    });

    it('flags Role ARN as required when the host reports invalid required vars', () => {
      renderSetup({ cloud, hasInvalidRequiredVars: true });

      expect(screen.getByText('Role ARN is required')).toBeInTheDocument();
      expect(screen.getByTestId('awsIdentityFederationSetup-roleArn')).toBeInvalid();
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
      mockUseProvisioningCallback.mockReturnValue({
        available: true,
        isChecking: false,
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

    it('passes the IaC confirm onto Create after a successful render', async () => {
      // The hook owns the render outcome; Create forwards it as-is, and with no stack ARN typed
      // no iac_deployment_id is posted alongside it.
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, { iacConfirm: RENDERED_IAC_CONFIRM })
      );
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      await fillRequiredNewIdentityFields(user);
      await user.click(screen.getByTestId('awsIdentityFederationSetup-createButton'));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'my-identity', ...RENDERED_IAC_CONFIRM })
      );
      expect(mockMutate.mock.calls[0][0]).not.toHaveProperty('iac_deployment_id');
    });

    it('posts the rendered key and the trimmed stack ARN on Create', async () => {
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, { iacConfirm: RENDERED_IAC_CONFIRM })
      );
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      await fillRequiredNewIdentityFields(user);
      await user.type(
        screen.getByTestId('awsIdentityFederationSetup-stackArn'),
        ` ${VALID_STACK_ARN} `
      );
      await user.click(screen.getByTestId('awsIdentityFederationSetup-createButton'));

      expect(mockMutate).toHaveBeenCalledWith({
        name: 'my-identity',
        cloudProvider: 'aws',
        accountType: 'single-account',
        vars: {
          role_arn: { value: NEW_ROLE_ARN, type: 'text' },
        },
        ...RENDERED_IAC_CONFIRM,
        iac_deployment_id: VALID_STACK_ARN,
      });
    });

    it('posts neither IaC field when nothing was rendered and no stack ARN was entered', async () => {
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      await fillRequiredNewIdentityFields(user);
      await user.click(screen.getByTestId('awsIdentityFederationSetup-createButton'));

      expect(mockMutate).toHaveBeenCalledWith({
        name: 'my-identity',
        cloudProvider: 'aws',
        accountType: 'single-account',
        vars: {
          role_arn: { value: NEW_ROLE_ARN, type: 'text' },
        },
      });
    });

    it('flags an invalid stack ARN and disables Create even with the other fields filled', async () => {
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      await fillRequiredNewIdentityFields(user);
      expect(screen.getByTestId('awsIdentityFederationSetup-createButton')).toBeEnabled();

      await user.type(screen.getByTestId('awsIdentityFederationSetup-stackArn'), 'not-an-arn');

      expect(screen.getByText(INVALID_STACK_ARN_MESSAGE)).toBeInTheDocument();
      expect(screen.getByTestId('awsIdentityFederationSetup-createButton')).toBeDisabled();
    });

    it('clears the form, the stack ARN and the rendered template details on create success and hands the new identity to IacKeyCheck', async () => {
      let onSuccess: ((connector: { id: string; name: string }) => void) | undefined;
      mockUseCreateCloudConnector.mockImplementation((cb) => {
        onSuccess = cb as typeof onSuccess;
        return { mutate: mockMutate, isLoading: false } as unknown as ReturnType<
          typeof useCreateCloudConnector
        >;
      });
      // Stateful stub of the hook's confirm-once contract: the template details stay until the
      // component clears them, after which the hook reports nothing to post.
      let iacConfirm: CloudConnectorIacState | undefined = RENDERED_IAC_CONFIRM;
      const clearIacConfirm = jest.fn(() => {
        iacConfirm = undefined;
      });
      mockUseCloudConnectorTemplate.mockImplementation(() =>
        provisionerHookResult(mockLaunchOnClick, { iacConfirm, clearIacConfirm })
      );
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      await fillRequiredNewIdentityFields(user);
      await user.type(screen.getByTestId('awsIdentityFederationSetup-stackArn'), VALID_STACK_ARN);
      await user.click(screen.getByTestId('awsIdentityFederationSetup-createButton'));
      expect(mockMutate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ...RENDERED_IAC_CONFIRM,
          iac_deployment_id: VALID_STACK_ARN,
        })
      );

      act(() => {
        onSuccess?.({ id: 'new-connector', name: 'Freshly Created' });
      });

      // Lands on the Existing tab with the new identity selected and under check.
      await waitFor(() => {
        expect(lastIacKeyCheckProps()?.cloudConnectorId).toBe('new-connector');
      });
      expect(onConnectorIdChange).toHaveBeenLastCalledWith('new-connector', 'Freshly Created');
      expect(clearIacConfirm).toHaveBeenCalledTimes(1);

      // Back on the New tab the fields are blank and the template details were consumed by the
      // first Create: a second Create without a new Launch posts neither the previous
      // key/blueprint nor the cleared stack ARN.
      await user.click(screen.getByRole('tab', { name: 'New Identity' }));
      expect(screen.getByTestId('awsIdentityFederationSetup-connectorName')).toHaveValue('');
      expect(screen.getByTestId('awsIdentityFederationSetup-roleArn')).toHaveValue('');
      expect(screen.getByTestId('awsIdentityFederationSetup-stackArn')).toHaveValue('');
      await fillRequiredNewIdentityFields(user);
      await user.click(screen.getByTestId('awsIdentityFederationSetup-createButton'));

      expect(mockMutate).toHaveBeenCalledTimes(2);
      expect(mockMutate).toHaveBeenLastCalledWith({
        name: 'my-identity',
        cloudProvider: 'aws',
        accountType: 'single-account',
        vars: {
          role_arn: { value: NEW_ROLE_ARN, type: 'text' },
        },
      });
    });

    it('keeps Create disabled while the live render is in flight', async () => {
      // Before the render settles there are no template details to post; a Create pressed then
      // would store a keyless identity that the late render could no longer attach to.
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, { isGeneratingTemplate: true })
      );
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      await fillRequiredNewIdentityFields(user);

      expect(screen.getByTestId('awsIdentityFederationSetup-createButton')).toBeDisabled();
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
      overrides: Partial<ReturnType<typeof useProvisioningCallback>>
    ): ReturnType<typeof useProvisioningCallback> => ({
      available: true,
      isChecking: false,
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
      mockUseProvisioningCallback.mockReturnValue(callbackState({}));
    });

    it('starts the callback at Launch with the typed name and the rendered template details', async () => {
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });
      await user.type(
        screen.getByTestId('awsIdentityFederationSetup-connectorName'),
        'my-identity'
      );

      expect(mockUseProvisioningCallback).toHaveBeenCalledWith({ enabled: true });
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

      expect(mockUseProvisioningCallback).toHaveBeenCalledWith({ enabled: true });
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
      mockUseProvisioningCallback.mockReturnValue(callbackState({ available: false }));
      renderSetup({ cloud, integrations });

      expect(mockUseCloudConnectorTemplate.mock.lastCall![0].getLaunchStackParams).toBeUndefined();
    });

    it('explains the callback is not available and leaves Launch and manual entry usable', () => {
      mockUseProvisioningCallback.mockReturnValue(callbackState({ available: false }));
      renderSetup({ cloud, integrations });

      expect(
        screen.getByTestId('awsIdentityFederationSetup-callbackUnavailable')
      ).toBeInTheDocument();
      // No name is needed before Launch: it is only needed at Create.
      expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeEnabled();
      expectManualEntryUnlocked();
      // The guide tells the user to paste the outputs, since nothing reports back.
      expect(screen.getByText(/then click the Outputs tab/)).toBeInTheDocument();
    });

    it('shows the server reason when the callback is not available because of the public URL', async () => {
      const reason =
        'The public Kibana URL http://kb.example.com is not https. CloudFormation only accepts an https callback URL.';
      mockUseProvisioningCallback.mockReturnValue(
        callbackState({ available: false, unavailableReason: reason })
      );
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      expect(
        screen.getByTestId('awsIdentityFederationSetup-callbackUnavailableReason')
      ).toHaveTextContent(reason);
      await typeIdentityName(user);
      expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeEnabled();
    });

    it('shows no callout and keeps Launch disabled while the server is still checking', async () => {
      mockUseProvisioningCallback.mockReturnValue(
        callbackState({ available: false, isChecking: true })
      );
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      expect(
        screen.queryByTestId('awsIdentityFederationSetup-callbackUnavailable')
      ).not.toBeInTheDocument();
      await typeIdentityName(user);
      expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeDisabled();
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

      expect(mockUseProvisioningCallback).toHaveBeenCalledWith({ enabled: false });
    });

    it('shows a spinner with a waiting hint while the stack has not called back yet', () => {
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'pending' }));
      renderSetup({ cloud, integrations });

      expect(screen.getByTestId('awsIdentityFederationSetup-callbackPending')).toHaveTextContent(
        'Creating stack'
      );
      expect(screen.getByTestId('awsIdentityFederationSetup-callbackSpinner')).toBeInTheDocument();
      // Nothing but the stage: no hint text and no way to take over by hand.
      expect(
        screen.queryByTestId('awsIdentityFederationSetup-enterManually')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('awsIdentityFederationSetup-callbackPending')).toHaveTextContent(
        /^Creating stack$/
      );
    });

    it('keeps the ARN fields and Create inside a collapsed "Create stack manually" section', () => {
      renderSetup({ cloud, integrations });

      const toggle = screen.getByTestId('awsIdentityFederationSetup-manualEntryToggle');
      expect(toggle).toHaveTextContent('Create stack manually');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      const section = screen.getByTestId('awsIdentityFederationSetup-manualEntry');
      expect(section).toContainElement(screen.getByTestId('awsIdentityFederationSetup-stackArn'));
      expect(section).toContainElement(screen.getByTestId('awsIdentityFederationSetup-roleArn'));
      expect(section).toContainElement(
        screen.getByTestId('awsIdentityFederationSetup-createButton')
      );
      expect(screen.queryByText('Steps to assume role')).not.toBeInTheDocument();
    });

    it('renders the host actions next to Create inside the manual section', () => {
      renderSetup({
        cloud,
        integrations,
        manualEntryActions: <button data-test-subj="host-deploy">Deploy integrations</button>,
      });

      expect(screen.getByTestId('awsIdentityFederationSetup-manualEntry')).toContainElement(
        screen.getByTestId('host-deploy')
      );
    });

    it('opens the manual section when CloudFormation cannot report back', () => {
      mockUseProvisioningCallback.mockReturnValue(
        callbackState({ available: false, isChecking: false })
      );
      renderSetup({ cloud, integrations });

      expect(screen.getByTestId('awsIdentityFederationSetup-manualEntryToggle')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });

    it.each(['expired', 'error'] as const)(
      'opens the manual section once the callback is %s',
      (status) => {
        mockUseProvisioningCallback.mockReturnValue(callbackState({ status }));
        renderSetup({ cloud, integrations });

        expect(screen.getByTestId('awsIdentityFederationSetup-manualEntryToggle')).toHaveAttribute(
          'aria-expanded',
          'true'
        );
      }
    );

    it('tells the host whether the New Identity tab is shown', async () => {
      // With identities to choose from the form opens on the Existing tab.
      mockGetConnectors();
      const onNewIdentityTabChange = jest.fn();
      const user = userEvent.setup();
      renderSetup({ cloud, integrations, onNewIdentityTabChange });

      expect(onNewIdentityTabChange).toHaveBeenLastCalledWith(false);
      await user.click(screen.getByRole('tab', { name: 'New Identity' }));
      expect(onNewIdentityTabChange).toHaveBeenLastCalledWith(true);
    });

    it('says it is creating the identity once the report is being applied', () => {
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'receiving' }));
      renderSetup({ cloud, integrations });

      expect(screen.getByTestId('awsIdentityFederationSetup-callbackPending')).toHaveTextContent(
        /^Creating identity$/
      );
      expect(screen.getByTestId('awsIdentityFederationSetup-callbackSpinner')).toBeInTheDocument();
      // Too late to take over by hand: the identity is already being made.
      expect(
        screen.queryByTestId('awsIdentityFederationSetup-enterManually')
      ).not.toBeInTheDocument();
      expectManualEntryLocked();
      expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeDisabled();
    });

    it.each(['idle', 'received', 'expired', 'error'] as const)(
      'shows no spinner when the callback is %s',
      (status) => {
        mockUseProvisioningCallback.mockReturnValue(callbackState({ status }));
        renderSetup({ cloud, integrations });

        expect(
          screen.queryByTestId('awsIdentityFederationSetup-callbackSpinner')
        ).not.toBeInTheDocument();
      }
    );

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

    it('stays on the New Identity tab with the identity the stack created selected and ready', async () => {
      const clearIacConfirm = jest.fn();
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, {
          iacConfirm: RENDERED_IAC_CONFIRM,
          clearIacConfirm,
        })
      );
      mockUseProvisioningCallback.mockReturnValue(
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
      // The screen does not change: the New tab stays selected and the stack just deployed the
      // current template, so the identity is ready without a check. The template details of the
      // launch belong to that identity now, and a second Launch would only make a duplicate.
      expect(screen.getByRole('tab', { name: 'New Identity' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(lastReadyValue(onReadyChange)).toBe(true);
      expect(lastIacKeyCheckProps()).toBeUndefined();
      expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeDisabled();
      expect(clearIacConfirm).toHaveBeenCalledTimes(1);
    });

    it('stays on the New Identity tab when the identity the stack created is the first one', () => {
      // A project with no identities yet: the initial tab was decided on an empty list.
      mockGetConnectors({ data: [] });
      mockUseProvisioningCallback.mockReturnValue(
        callbackState({ status: 'deploying', created: { id: 'cc-1', name: 'my-identity' } })
      );
      const { rerender } = renderSetup({ cloud, integrations });
      expect(screen.getByRole('tab', { name: 'New Identity' })).toHaveAttribute(
        'aria-selected',
        'true'
      );

      // The list refetched after the creation now has one entry: no reason to move the user.
      mockGetConnectors();
      rerender(setupElement({ cloud, integrations }));

      expect(screen.getByRole('tab', { name: 'New Identity' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('keeps the name of the identity the stack created on screen', async () => {
      const user = userEvent.setup();
      const { rerender } = renderSetup({ cloud, integrations });
      await typeIdentityName(user);

      mockUseProvisioningCallback.mockReturnValue(
        callbackState({ status: 'received', created: { id: 'cc-1', name: 'my-identity' } })
      );
      rerender(setupElement({ cloud, integrations }));

      expect(screen.getByTestId('awsIdentityFederationSetup-connectorName')).toHaveValue(
        'my-identity'
      );
    });

    it('keeps the ARN fields and Create unlocked before Launch', () => {
      renderSetup({ cloud, integrations });

      expectManualEntryUnlocked();
    });

    it('locks the ARN fields and Create while waiting for the stack to report back', () => {
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'pending' }));
      renderSetup({ cloud, integrations });

      expectManualEntryLocked();
      expect(screen.getByTestId('awsIdentityFederationSetup-callbackSpinner')).toBeInTheDocument();
    });

    it.each(['expired', 'error'] as const)(
      'unlocks the ARN fields with a hint once the callback is %s',
      (status) => {
        mockUseProvisioningCallback.mockReturnValue(callbackState({ status }));
        renderSetup({ cloud, integrations });

        expectManualEntryUnlocked();
        expect(
          screen.getByTestId('awsIdentityFederationSetup-callbackGivenUp')
        ).toBeInTheDocument();
        expect(
          screen.queryByTestId('awsIdentityFederationSetup-callbackPending')
        ).not.toBeInTheDocument();
      }
    );

    it('fills the ARN fields with what the stack reported', async () => {
      const user = userEvent.setup();
      mockUseProvisioningCallback.mockReturnValue(
        callbackState({
          status: 'received',
          created: {
            id: 'cc-1',
            name: 'my-identity',
            role_arn: REPORTED_ROLE_ARN,
            stack_arn: VALID_STACK_ARN,
          },
        })
      );
      renderSetup({ cloud, integrations });

      // The form moved to the Existing tab with the identity selected; the New tab shows what
      // the stack reported.
      await user.click(screen.getByRole('tab', { name: 'New Identity' }));
      expect(screen.getByTestId('awsIdentityFederationSetup-roleArn')).toHaveValue(
        REPORTED_ROLE_ARN
      );
      expect(screen.getByTestId('awsIdentityFederationSetup-stackArn')).toHaveValue(
        VALID_STACK_ARN
      );
    });

    it('keeps the reported ARNs read-only after the stack reported, so they cannot be re-created', async () => {
      const user = userEvent.setup();
      mockUseProvisioningCallback.mockReturnValue(
        callbackState({
          status: 'received',
          created: {
            id: 'cc-1',
            name: 'my-identity',
            role_arn: REPORTED_ROLE_ARN,
            stack_arn: VALID_STACK_ARN,
          },
        })
      );
      renderSetup({ cloud, integrations });

      await user.click(screen.getByRole('tab', { name: 'New Identity' }));
      expectManualEntryLocked();
      expect(screen.getByTestId('awsIdentityFederationSetup-roleArn')).toHaveValue(
        REPORTED_ROLE_ARN
      );
      expect(
        screen.queryByTestId('awsIdentityFederationSetup-callbackSpinner')
      ).not.toBeInTheDocument();
    });

    it('clears the shown ARNs when launching again', async () => {
      const user = userEvent.setup();
      mockUseProvisioningCallback.mockReturnValue(
        callbackState({
          status: 'received',
          created: {
            id: 'cc-1',
            name: 'my-identity',
            role_arn: REPORTED_ROLE_ARN,
            stack_arn: VALID_STACK_ARN,
          },
        })
      );
      renderSetup({ cloud, integrations });
      await user.click(screen.getByRole('tab', { name: 'New Identity' }));
      expect(screen.getByTestId('awsIdentityFederationSetup-roleArn')).toHaveValue(
        REPORTED_ROLE_ARN
      );

      await typeIdentityName(user);
      const { getLaunchStackParams } = mockUseCloudConnectorTemplate.mock.lastCall![0];
      await act(async () => {
        await getLaunchStackParams?.(RENDERED_IAC_CONFIRM);
      });

      expect(screen.getByTestId('awsIdentityFederationSetup-roleArn')).toHaveValue('');
      expect(screen.getByTestId('awsIdentityFederationSetup-stackArn')).toHaveValue('');
    });

    describe('automatic deploy handoff', () => {
      const launch = async (user: ReturnType<typeof userEvent.setup>) => {
        await typeIdentityName(user);
        const { getLaunchStackParams } = mockUseCloudConnectorTemplate.mock.lastCall![0];
        await act(async () => {
          await getLaunchStackParams?.(RENDERED_IAC_CONFIRM);
        });
      };

      it('asks the host to prepare the launch and hands the deployment id to the record', async () => {
        const onPrepareLaunch = jest.fn().mockResolvedValue({ onboardingDeploymentId: 'dep-1' });
        const user = userEvent.setup();
        renderSetup({ cloud, integrations, onPrepareLaunch });

        await launch(user);

        expect(onPrepareLaunch).toHaveBeenCalledTimes(1);
        expect(mockCallbackStart).toHaveBeenCalledWith(
          expect.objectContaining({ connectorName: 'my-identity', onboardingDeploymentId: 'dep-1' })
        );
      });

      it('launches without a deployment when the host returns nothing', async () => {
        const onPrepareLaunch = jest.fn().mockResolvedValue(undefined);
        const user = userEvent.setup();
        renderSetup({ cloud, integrations, onPrepareLaunch });

        await launch(user);

        const [input] = mockCallbackStart.mock.lastCall!;
        expect(input).not.toHaveProperty('onboardingDeploymentId');
      });

      it('says it is deploying integrations on the same screen, with Create disabled, while the server deploys', () => {
        mockUseProvisioningCallback.mockReturnValue(
          callbackState({
            status: 'deploying',
            created: {
              id: 'cc-1',
              name: 'my-identity',
              role_arn: REPORTED_ROLE_ARN,
              stack_arn: VALID_STACK_ARN,
            },
          })
        );
        renderSetup({ cloud, integrations });

        // The identity exists already, but the user stays where the stages are shown.
        expect(screen.getByRole('tab', { name: 'New Identity' })).toHaveAttribute(
          'aria-selected',
          'true'
        );
        expect(screen.getByTestId('awsIdentityFederationSetup-callbackPending')).toHaveTextContent(
          'Deploying integrations'
        );
        expect(
          screen.getByTestId('awsIdentityFederationSetup-callbackSpinner')
        ).toBeInTheDocument();
        expect(
          screen.queryByTestId('awsIdentityFederationSetup-enterManually')
        ).not.toBeInTheDocument();
        expectManualEntryLocked();
        expect(screen.getByTestId('awsIdentityFederationSetup-roleArn')).toHaveValue(
          REPORTED_ROLE_ARN
        );
        expect(
          screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')
        ).toBeDisabled();
      });

      it('hands the deploy outcome to the host once', () => {
        const onDeployOutcome = jest.fn();
        const outcome = { status: 'deployed' as const, onboardingDeploymentId: 'dep-1' };
        mockUseProvisioningCallback.mockReturnValue(
          callbackState({
            status: 'received',
            created: { id: 'cc-1', name: 'my-identity' },
            deployOutcome: outcome,
          })
        );
        const { rerender } = renderSetup({ cloud, integrations, onDeployOutcome });
        rerender(setupElement({ cloud, integrations, onDeployOutcome }));

        expect(onDeployOutcome).toHaveBeenCalledTimes(1);
        expect(onDeployOutcome).toHaveBeenCalledWith(outcome);
      });

      it('tells the host it stopped waiting when unmounted mid-wait', () => {
        const onWaitingChange = jest.fn();
        mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'pending' }));
        const { unmount } = renderSetup({ cloud, integrations, onWaitingChange });
        expect(onWaitingChange).toHaveBeenLastCalledWith(true);

        unmount();

        expect(onWaitingChange).toHaveBeenLastCalledWith(false);
      });

      it('tells the host when it starts and stops waiting', () => {
        const onWaitingChange = jest.fn();
        const { rerender } = renderSetup({ cloud, integrations, onWaitingChange });
        expect(onWaitingChange).toHaveBeenLastCalledWith(false);

        mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'pending' }));
        rerender(setupElement({ cloud, integrations, onWaitingChange }));
        expect(onWaitingChange).toHaveBeenLastCalledWith(true);

        mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'deploying' }));
        rerender(setupElement({ cloud, integrations, onWaitingChange }));
        expect(onWaitingChange).toHaveBeenLastCalledWith(true);

        mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'received' }));
        rerender(setupElement({ cloud, integrations, onWaitingChange }));
        expect(onWaitingChange).toHaveBeenLastCalledWith(false);
      });
    });

    it('retires a record the deadline could not before creating the identity by hand', async () => {
      // A failed cancel at the deadline keeps the id, so Create retries the cancel first.
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'expired' }));
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      await fillRequiredNewIdentityFields(user);
      await user.click(screen.getByTestId('awsIdentityFederationSetup-createButton'));

      expect(mockCallbackCancel).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ name: 'my-identity' }));
    });

    it('does not create by hand when the stack reported first', async () => {
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'expired' }));
      mockCallbackCancel.mockResolvedValue('created');
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      await fillRequiredNewIdentityFields(user);
      await user.click(screen.getByTestId('awsIdentityFederationSetup-createButton'));

      expect(mockCallbackCancel).toHaveBeenCalledTimes(1);
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('does not create by hand when the record could not be retired', async () => {
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'expired' }));
      mockCallbackCancel.mockResolvedValue('failed');
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      await fillRequiredNewIdentityFields(user);
      await user.click(screen.getByTestId('awsIdentityFederationSetup-createButton'));

      expect(mockMutate).not.toHaveBeenCalled();
      expect(mockAddDanger).toHaveBeenCalledWith({
        title:
          'Could not stop waiting for CloudFormation. Try again, or wait for the stack to report back.',
      });
    });

    it('keeps the name editable but disables Launch while waiting: one launch at a time', () => {
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'pending' }));
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, {
          iacConfirm: RENDERED_IAC_CONFIRM,
          hasLaunched: true,
        })
      );
      renderSetup({ cloud, integrations });

      expect(screen.getByTestId('awsIdentityFederationSetup-connectorName')).toBeEnabled();
      expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeDisabled();
      expect(screen.getByTestId('awsIdentityFederationSetup-callbackSpinner')).toBeInTheDocument();
    });

    it('shows the spinner while waiting on a static launch with the provisioner off', () => {
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'pending' }));
      mockUseCloudConnectorTemplate.mockReturnValue({
        ...staticTemplateHookResult,
        hasLaunched: true,
      });
      renderSetup({ cloud });

      expect(screen.getByTestId('awsIdentityFederationSetup-callbackSpinner')).toBeInTheDocument();
    });

    it.each(['expired', 'error'] as const)(
      'lets the user launch again, without a spinner, when the callback is %s',
      async (status) => {
        mockUseProvisioningCallback.mockReturnValue(callbackState({ status }));
        const user = userEvent.setup();
        renderSetup({ cloud, integrations });

        expect(
          screen.queryByTestId('awsIdentityFederationSetup-callbackSpinner')
        ).not.toBeInTheDocument();
        await typeIdentityName(user);
        expect(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation')).toBeEnabled();
      }
    );

    it('keeps waiting after a static-template fallback', () => {
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'pending' }));
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
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'pending' }));
      mockUseCloudConnectorTemplate.mockReturnValue(
        provisionerHookResult(mockLaunchOnClick, { templateGenerationError: 'boom' })
      );
      renderSetup({ cloud, integrations });

      expect(mockCallbackCancel).toHaveBeenCalled();
    });

    it('keeps waiting on a rendered launch', () => {
      mockUseProvisioningCallback.mockReturnValue(callbackState({ status: 'pending' }));
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
