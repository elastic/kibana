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
import type {
  IacPolicyTemplateSelection,
  RenderIacTemplateIntegration,
} from '../../../../common/types/rest_spec/iac_provisioner';
import type { CloudConnectorIacState } from '../../../../common/types/models/cloud_connector';

import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { useCreateCloudConnector } from '../hooks/use_create_cloud_connector';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';
import { IacKeyCheck } from '../components/iac_key_check';
import { INVALID_STACK_ARN_MESSAGE } from '../utils';

import { AwsIdentityFederationSetup } from './aws_identity_federation_setup';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../hooks/use_get_cloud_connectors');
jest.mock('../hooks/use_create_cloud_connector');
jest.mock('../hooks/use_cloud_connector_template');
jest.mock('../../../hooks', () => ({
  useIacProvisioner: jest.fn(),
  useStartServices: jest.fn(),
}));
jest.mock('../components/iac_key_check', () => ({ IacKeyCheck: jest.fn() }));

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
const mockIacKeyCheck = IacKeyCheck as jest.MockedFunction<typeof IacKeyCheck>;
const { useIacProvisioner: mockUseIacProvisioner } = jest.requireMock('../../../hooks') as {
  useIacProvisioner: jest.MockedFunction<() => { isIacProvisionerEnabled: boolean }>;
};

const STATIC_TEMPLATE_URL = 'https://console.aws.amazon.com/cloudformation/static';
const VALID_STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/abc';
// Template details the hook owns after a successful live render (key + blueprint), which Create
// forwards verbatim as iac_key / iac_blueprint_*.
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

  /** Fills the fields Create requires so a test can focus on the IaC fields. */
  const fillRequiredNewIdentityFields = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByTestId('awsIdentityFederationSetup-connectorName'), 'my-identity');
    await user.type(
      screen.getByTestId('awsIdentityFederationSetup-roleArn'),
      'arn:aws:iam::123456789012:role/NewRole'
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    mockUseKibana.mockReturnValue({
      services: { application: { navigateToApp: jest.fn() } },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseCreateCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useCreateCloudConnector>);

    mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
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

    it('asks the template hook for the static template and links the Launch button to it', () => {
      renderSetup({ cloud, iacTemplateUrl: 'https://example.com/template.yml' });

      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'aws',
          cloud,
          accountType: 'single-account',
          iacTemplateUrl: 'https://example.com/template.yml',
          integrations: undefined,
        })
      );
      const launchButton = screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation');
      expect(launchButton).toHaveAttribute('href', STATIC_TEMPLATE_URL);
      expect(launchButton).toHaveAttribute('target', '_blank');
    });

    it('does not render the stack ARN field while the provisioner is off', () => {
      renderSetup({ cloud });

      expect(screen.queryByTestId('awsIdentityFederationSetup-stackArn')).not.toBeInTheDocument();
    });

    it('renders the stack ARN field when the provisioner is on, even without integrations', () => {
      // The field is gated on the flag alone: the hook's missing-context fallback still opens a
      // CloudFormation console the user can copy a StackId from.
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockUseCloudConnectorTemplate.mockReturnValue(provisionerHookResult(mockLaunchOnClick));

      renderSetup({ cloud });

      expect(screen.getByTestId('awsIdentityFederationSetup-stackArn')).toBeInTheDocument();
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
          role_arn: { value: 'arn:aws:iam::123456789012:role/NewRole', type: 'text' },
        },
      });
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
    });

    it('passes the integrations to the template hook and launches through its onClick', async () => {
      const user = userEvent.setup();
      renderSetup({ cloud, integrations });

      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'aws', integrations })
      );

      await user.click(screen.getByTestId('awsIdentityFederationSetup-launchCloudFormation'));
      expect(mockLaunchOnClick).toHaveBeenCalledTimes(1);
    });

    it('forwards packageName and policyTemplates to the template hook', () => {
      const policyTemplates: IacPolicyTemplateSelection[] = [
        { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
      ];

      renderSetup({ cloud, packageName: 'aws', policyTemplates });

      expect(mockUseCloudConnectorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'aws',
          packageName: 'aws',
          policyTemplates,
          integrations: undefined,
        })
      );
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
          role_arn: { value: 'arn:aws:iam::123456789012:role/NewRole', type: 'text' },
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
          role_arn: { value: 'arn:aws:iam::123456789012:role/NewRole', type: 'text' },
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
      // Stateful stub of the hook's confirm-once contract: the template details stays until the
      // component clears it, after which the hook reports nothing to post.
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

      // Back on the New tab the component's own fields are blank and the rendered template details was
      // consumed by the first Create: a second Create without a new Launch posts neither the
      // previous key/blueprint nor the cleared stack ARN.
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
          role_arn: { value: 'arn:aws:iam::123456789012:role/NewRole', type: 'text' },
        },
      });
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

  describe('Existing Identity tab with integrations', () => {
    beforeEach(() => {
      mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
    });

    it('hands the selected id, the integrations and the template context to IacKeyCheck', () => {
      renderSetup({
        cloud,
        integrations,
        iacTemplateUrl: 'https://example.com/template.yml',
        initialConnectorId: 'connector-1',
      });

      expect(screen.getByTestId('mockIacKeyCheck')).toBeInTheDocument();
      const props = lastIacKeyCheckProps();
      expect(props).toEqual(
        expect.objectContaining({
          cloudConnectorId: 'connector-1',
          integrations,
          cloud,
          accountType: 'single-account',
          iacTemplateUrl: 'https://example.com/template.yml',
        })
      );
      expect(props?.onValidityChange).toEqual(expect.any(Function));
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
        lastIacKeyCheckProps()?.onTemplateRecorded?.({
          iac_key: 'sha256:new',
          iac_blueprint_id: 'federated-identity',
          iac_blueprint_version: '1.0.0',
        });
        lastIacKeyCheckProps()?.onValidityChange?.(true);
      });

      expect(onIacTemplateRecorded).toHaveBeenCalledWith({
        iac_key: 'sha256:new',
        iac_blueprint_id: 'federated-identity',
        iac_blueprint_version: '1.0.0',
      });
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
