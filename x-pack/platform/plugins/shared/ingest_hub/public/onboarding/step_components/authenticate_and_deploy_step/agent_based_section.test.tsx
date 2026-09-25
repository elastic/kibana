/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyAgentEnrollmentFlyout: jest.fn(),
  LazyAwsStaticKeysForm: jest.fn(),
  LazyAwsTemporaryKeysForm: jest.fn(),
  LazyAgentPolicyIntegrationForm: jest.fn(),
  useGetAgentPoliciesQuery: jest.fn(),
  agentPolicyFormValidation: jest.fn(),
}));

jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('./agent_based_deploy/agent_policy_name', () => ({
  buildAgentPolicyName: jest.fn().mockResolvedValue('AWS Agent Policy 1'),
}));

jest.mock('./agent_based_section/shared_credentials_form', () => ({
  SharedCredentialsForm: jest.fn(),
}));

jest.mock('./agent_based_section/assume_role_form', () => ({
  AssumeRoleForm: jest.fn(),
}));

import {
  LazyAgentEnrollmentFlyout,
  LazyAwsStaticKeysForm,
  LazyAwsTemporaryKeysForm,
  LazyAgentPolicyIntegrationForm,
  useGetAgentPoliciesQuery,
  agentPolicyFormValidation,
} from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useLocation } from 'react-router-dom';
import { SharedCredentialsForm } from './agent_based_section/shared_credentials_form';
import { AssumeRoleForm } from './agent_based_section/assume_role_form';

const mockUseLocation = useLocation as jest.Mock;

const MockSharedCredentialsForm = SharedCredentialsForm as unknown as jest.Mock;
const MockAssumeRoleForm = AssumeRoleForm as unknown as jest.Mock;
const MockAgentEnrollmentFlyout = LazyAgentEnrollmentFlyout as unknown as jest.Mock;
const MockStaticKeysForm = LazyAwsStaticKeysForm as unknown as jest.Mock;
const MockTemporaryKeysForm = LazyAwsTemporaryKeysForm as unknown as jest.Mock;
const MockAgentPolicyIntegrationForm = LazyAgentPolicyIntegrationForm as unknown as jest.Mock;
const mockAgentPolicyFormValidation = agentPolicyFormValidation as jest.Mock;
const mockUseGetAgentPoliciesQuery = useGetAgentPoliciesQuery as jest.Mock;
const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { AgentBasedSection } from './agent_based_section';

interface OnboardingFlowOptions {
  agentHostsMode?: 'new' | 'existing';
  agentPolicyId?: string;
  agentPolicyName?: string;
  selectedAgentPolicyIds?: string[];
  agentCredentialMethod?: 'static_keys' | 'temporary_keys' | 'shared_credentials' | 'assume_role';
  withSysMonitoring?: boolean;
  setAgentBasedDeployment?: jest.Mock;
  /** Persisted role ARN — seeds isCredentialReady:true for assume_role */
  roleArn?: string;
  /** Persisted credential profile name — seeds isCredentialReady:true for shared_credentials */
  credentialProfileName?: string;
  /** Whether the URL contains ?deploymentId= (resume/edit mode) */
  isEditMode?: boolean;
}

function setupMocks({
  agentHostsMode = 'new',
  agentPolicyId = undefined,
  agentPolicyName = undefined,
  selectedAgentPolicyIds = [],
  agentCredentialMethod = 'static_keys',
  withSysMonitoring = undefined,
  setAgentBasedDeployment = jest.fn(),
  roleArn = undefined,
  credentialProfileName = undefined,
  isEditMode = false,
}: OnboardingFlowOptions = {}) {
  mockUseLocation.mockReturnValue({ search: isEditMode ? '?deploymentId=dep-test' : '' });
  MockAgentEnrollmentFlyout.mockImplementation((props: any) => (
    <div data-test-subj="agent-enrollment-flyout">
      {props.hideIncomingDataStep && <span data-test-subj="flyout-hideIncomingDataStep" />}
      {props.onAgentPolicyCreated && (
        <button
          onClick={() =>
            props.onAgentPolicyCreated({ id: 'new-policy-id', name: 'AWS Agent Policy 1' })
          }
        >
          simulate-policy-created
        </button>
      )}
    </div>
  ));

  MockStaticKeysForm.mockImplementation(
    ({ onReadyChange }: { onReadyChange?: (v: boolean) => void }) => (
      <div data-test-subj="static-keys-form">
        <button onClick={() => onReadyChange?.(true)}>mark-credential-ready</button>
      </div>
    )
  );

  MockTemporaryKeysForm.mockImplementation(
    ({ onReadyChange }: { onReadyChange?: (v: boolean) => void }) => (
      <div data-test-subj="temporary-keys-form">
        <button onClick={() => onReadyChange?.(true)}>mark-temp-credential-ready</button>
      </div>
    )
  );

  MockAgentPolicyIntegrationForm.mockImplementation(() => (
    <div data-test-subj="agent-policy-integration-form" />
  ));

  MockSharedCredentialsForm.mockImplementation(
    ({
      onSharedCredentialFileChange,
      onCredentialProfileNameChange,
    }: {
      onSharedCredentialFileChange?: (v: string) => void;
      onCredentialProfileNameChange?: (v: string) => void;
    }) => (
      <div data-test-subj="shared-credentials-form">
        <button onClick={() => onSharedCredentialFileChange?.('/path/to/creds')}>
          set-shared-file
        </button>
        <button onClick={() => onSharedCredentialFileChange?.('')}>clear-shared-file</button>
        <button onClick={() => onCredentialProfileNameChange?.('my-profile')}>
          set-profile-name
        </button>
        <button onClick={() => onCredentialProfileNameChange?.('')}>clear-profile-name</button>
      </div>
    )
  );

  MockAssumeRoleForm.mockImplementation(
    ({ onRoleArnChange }: { onRoleArnChange?: (v: string) => void }) => (
      <div data-test-subj="assume-role-form">
        <button onClick={() => onRoleArnChange?.('arn:aws:iam::123:role/MyRole')}>
          set-role-arn
        </button>
        <button onClick={() => onRoleArnChange?.('')}>clear-role-arn</button>
      </div>
    )
  );

  // By default, validation returns no errors (form valid).
  mockAgentPolicyFormValidation.mockReturnValue({});

  mockUseGetAgentPoliciesQuery.mockReturnValue({ data: { items: [] }, isLoading: false });

  mockUseOnboardingFlow.mockReturnValue({
    agentBasedDeployment: {
      agentHostsMode,
      agentPolicyId,
      agentPolicyName,
      selectedAgentPolicyIds,
      agentCredentialMethod,
      withSysMonitoring,
      roleArn,
      credentialProfileName,
    },
    setAgentBasedDeployment,
  });
}

interface RenderOptions {
  serviceCount?: number;
  onDeploy?: jest.Mock;
  onNextReadyChange?: jest.Mock;
  isDeploying?: boolean;
  isDone?: boolean;
  hasFailed?: boolean;
  failedInstances?: string[];
  deployErrors?: Record<string, string> | undefined;
}

function renderSection(props: RenderOptions = {}) {
  const onDeploy = props.onDeploy ?? jest.fn();
  const onNextReadyChange = props.onNextReadyChange;
  return render(
    <I18nProvider>
      <React.Suspense fallback={null}>
        <AgentBasedSection
          serviceCount={props.serviceCount ?? 2}
          onDeploy={onDeploy}
          onNextReadyChange={onNextReadyChange}
          isDeploying={props.isDeploying ?? false}
          isDone={props.isDone ?? false}
          hasFailed={props.hasFailed ?? false}
          failedInstances={props.failedInstances ?? []}
          deployErrors={props.deployErrors}
        />
      </React.Suspense>
    </I18nProvider>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AgentBasedSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('pre-create state — new policy mode', () => {
    it('shows "Create a new agent policy" radio selected by default', async () => {
      renderSection();
      await waitFor(() => {
        const radio = screen.getByRole('radio', { name: /create a new agent policy/i });
        expect(radio).toBeChecked();
      });
    });

    it('shows AgentPolicyIntegrationForm', async () => {
      renderSection();
      await waitFor(() => {
        expect(screen.getByTestId('agent-policy-integration-form')).toBeInTheDocument();
      });
    });

    it('does NOT show post-create summary', async () => {
      renderSection();
      await waitFor(() => {
        expect(screen.queryByText(/agent policy.*has been created/i)).not.toBeInTheDocument();
      });
    });

    it('"Add agent" button is disabled when credential form not ready (even when form valid)', async () => {
      // Validation passes but credentials not ready → button disabled.
      mockAgentPolicyFormValidation.mockReturnValue({});
      renderSection();
      await waitFor(() => {
        expect(screen.getByTestId('agentBasedSection-addAgentButton')).toBeDisabled();
      });
    });

    it('"Add agent" button enables when credentials ready and form valid', async () => {
      // Set persisted name so isPolicyNameLoading = false.
      setupMocks({ agentPolicyName: 'AWS Agent Policy 1' });
      mockAgentPolicyFormValidation.mockReturnValue({});
      renderSection();
      act(() => {
        fireEvent.click(screen.getByText('mark-credential-ready'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('agentBasedSection-addAgentButton')).not.toBeDisabled();
      });
    });

    it('"Add agent" button disabled when policy form has validation errors', async () => {
      setupMocks({ agentPolicyName: 'AWS Agent Policy 1' });
      // Return a validation error.
      mockAgentPolicyFormValidation.mockReturnValue({ name: 'Name is required' });
      renderSection();
      act(() => {
        fireEvent.click(screen.getByText('mark-credential-ready'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('agentBasedSection-addAgentButton')).toBeDisabled();
      });
    });

    it('clicking "Add agent" opens the flyout (does NOT call onDeploy)', async () => {
      setupMocks({ agentPolicyName: 'AWS Agent Policy 1' });
      mockAgentPolicyFormValidation.mockReturnValue({});
      const onDeploy = jest.fn();
      renderSection({ onDeploy });
      act(() => {
        fireEvent.click(screen.getByText('mark-credential-ready'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('agentBasedSection-addAgentButton')).not.toBeDisabled();
      });
      fireEvent.click(screen.getByTestId('agentBasedSection-addAgentButton'));
      expect(onDeploy).not.toHaveBeenCalled();
      expect(screen.getByTestId('agent-enrollment-flyout')).toBeInTheDocument();
    });

    it('does NOT show "Add another agent" button in pre-create state', async () => {
      renderSection();
      await waitFor(() => {
        expect(
          screen.queryByTestId('agentBasedSection-addAnotherAgentButton')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('pre-deploy state — existing policy mode', () => {
    beforeEach(() => {
      setupMocks({ agentHostsMode: 'existing', selectedAgentPolicyIds: [] });
    });

    it('shows policy combobox when agentHostsMode="existing"', () => {
      renderSection();
      expect(screen.getByTestId('agentBasedSection-agentPoliciesComboBox')).toBeInTheDocument();
    });

    it('does NOT show AgentPolicyIntegrationForm in existing mode', () => {
      renderSection();
      expect(screen.queryByTestId('agent-policy-integration-form')).not.toBeInTheDocument();
    });

    it('does NOT show "Add agent" button in existing mode', () => {
      renderSection();
      expect(screen.queryByTestId('agentBasedSection-addAgentButton')).not.toBeInTheDocument();
    });
  });

  describe('existing policy options filtering', () => {
    const regularPolicy = { id: 'regular', name: 'Regular policy' };
    const managedPolicy = { id: 'managed', name: 'Managed policy', is_managed: true };
    const fleetServerPolicy = {
      id: 'fleet-server',
      name: 'Fleet Server policy',
      has_fleet_server: true,
    };
    const agentlessPolicy = {
      id: 'agentless',
      name: 'Agentless policy for aws-123',
      is_managed: false,
      supports_agentless: true,
    };

    beforeEach(() => {
      setupMocks({ agentHostsMode: 'existing', selectedAgentPolicyIds: [] });
    });

    it('excludes agentless policies in the Fleet query', () => {
      renderSection();
      expect(mockUseGetAgentPoliciesQuery).toHaveBeenCalledWith(
        {
          full: false,
          perPage: 1000,
          sortField: 'name',
          sortOrder: 'asc',
          kuery: 'NOT ingest-agent-policies.supports_agentless:true',
        },
        { enabled: true }
      );
    });

    it('lists only regular policies, hiding managed, Fleet Server and agentless ones', () => {
      mockUseGetAgentPoliciesQuery.mockReturnValue({
        data: { items: [regularPolicy, managedPolicy, fleetServerPolicy, agentlessPolicy] },
        isLoading: false,
      });
      renderSection();

      const comboBox = screen.getByTestId('agentBasedSection-agentPoliciesComboBox');
      fireEvent.click(within(comboBox).getByTestId('comboBoxToggleListButton'));

      expect(screen.getByRole('option', { name: 'Regular policy' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Managed policy' })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Fleet Server policy' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('option', { name: 'Agentless policy for aws-123' })
      ).not.toBeInTheDocument();
    });

    it('shows the empty placeholder when only agentless policies are returned', () => {
      mockUseGetAgentPoliciesQuery.mockReturnValue({
        data: { items: [agentlessPolicy] },
        isLoading: false,
      });
      renderSection();
      expect(screen.getByPlaceholderText('No agent policies available')).toBeDisabled();
    });
  });

  describe('post-create — new policy mode (agentPolicyId set)', () => {
    beforeEach(() => {
      setupMocks({
        agentHostsMode: 'new',
        agentPolicyId: 'policy-123',
        agentPolicyName: 'AWS Agent Policy 1',
      });
    });

    it('shows post-create summary text mentioning policy name', () => {
      renderSection();
      expect(screen.getByText(/agent policy.*has been created/i)).toBeInTheDocument();
    });

    it('does NOT show AgentPolicyIntegrationForm after policy is created', () => {
      renderSection();
      expect(screen.queryByTestId('agent-policy-integration-form')).not.toBeInTheDocument();
    });

    it('shows "Add another agent" button', () => {
      renderSection();
      const btn = screen.getByTestId('agentBasedSection-addAnotherAgentButton');
      expect(btn).toBeInTheDocument();
    });

    it('clicking "Add another agent" opens flyout', () => {
      const onDeploy = jest.fn();
      renderSection({ onDeploy });
      fireEvent.click(screen.getByTestId('agentBasedSection-addAnotherAgentButton'));
      expect(onDeploy).not.toHaveBeenCalled();
      expect(screen.getByTestId('agent-enrollment-flyout')).toBeInTheDocument();
    });

    it('does NOT show "Add agent" pre-create button', () => {
      renderSection();
      expect(screen.queryByTestId('agentBasedSection-addAgentButton')).not.toBeInTheDocument();
    });

    it('radio buttons are disabled when agentPolicyId is set (mode locked)', () => {
      renderSection();
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).toBeDisabled();
      });
    });
  });

  describe('radio onChange calls setAgentBasedDeployment', () => {
    it('radio onChange calls setAgentBasedDeployment', () => {
      const setAgentBasedDeployment = jest.fn();
      setupMocks({ agentHostsMode: 'new', setAgentBasedDeployment });
      renderSection();
      fireEvent.click(screen.getByRole('radio', { name: /use an existing agent policy/i }));
      expect(setAgentBasedDeployment).toHaveBeenCalledWith({ agentHostsMode: 'existing' });
    });
  });

  describe('existing mode combobox visible', () => {
    it('when agentHostsMode="existing", combobox appears', () => {
      setupMocks({
        agentHostsMode: 'existing',
        agentPolicyId: undefined,
        selectedAgentPolicyIds: [],
      });
      renderSection();
      expect(screen.getByTestId('agentBasedSection-agentPoliciesComboBox')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('hasFailed=true shows error callout', () => {
      renderSection({ hasFailed: true });
      expect(screen.getByTestId('agentBasedSection-errorCallout')).toBeInTheDocument();
    });

    it('clicking Retry calls onDeploy with failedInstances', () => {
      const onDeploy = jest.fn();
      renderSection({ hasFailed: true, onDeploy, failedInstances: ['instance-1', 'instance-2'] });
      fireEvent.click(screen.getByTestId('agentBasedSection-retryButton'));
      expect(onDeploy).toHaveBeenCalledWith(['instance-1', 'instance-2']);
    });
  });

  describe('flyout — hideIncomingDataStep', () => {
    it('passes hideIncomingDataStep to the flyout so "Confirm incoming data" is hidden', async () => {
      setupMocks({ agentPolicyName: 'AWS Agent Policy 1' });
      mockAgentPolicyFormValidation.mockReturnValue({});
      renderSection();
      act(() => {
        fireEvent.click(screen.getByText('mark-credential-ready'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('agentBasedSection-addAgentButton')).not.toBeDisabled();
      });
      fireEvent.click(screen.getByTestId('agentBasedSection-addAgentButton'));
      expect(screen.getByTestId('flyout-hideIncomingDataStep')).toBeInTheDocument();
    });
  });

  describe('flyout — onAgentPolicyCreated callback', () => {
    it('persists id+name via setAgentBasedDeployment when policy is created in flyout', async () => {
      const setAgentBasedDeployment = jest.fn();
      setupMocks({ agentPolicyName: 'AWS Agent Policy 1', setAgentBasedDeployment });
      mockAgentPolicyFormValidation.mockReturnValue({});
      renderSection();

      // Open flyout
      act(() => {
        fireEvent.click(screen.getByText('mark-credential-ready'));
      });
      await waitFor(() => {
        expect(screen.getByTestId('agentBasedSection-addAgentButton')).not.toBeDisabled();
      });
      fireEvent.click(screen.getByTestId('agentBasedSection-addAgentButton'));

      // Simulate Fleet creating the policy inside the flyout
      act(() => {
        fireEvent.click(screen.getByText('simulate-policy-created'));
      });

      // id and name must be persisted to context
      expect(setAgentBasedDeployment).toHaveBeenCalledWith(
        expect.objectContaining({
          agentPolicyId: 'new-policy-id',
          agentPolicyName: 'AWS Agent Policy 1',
        })
      );
    });

    it('post-create: summary visible, form gone, "Add another agent" shown, radios locked', () => {
      // The post-create state is driven by agentPolicyId being set in context.
      // Simulate the state after onAgentPolicyCreated has been called and persisted.
      setupMocks({
        agentHostsMode: 'new',
        agentPolicyId: 'new-policy-id',
        agentPolicyName: 'AWS Agent Policy 1',
      });
      renderSection();

      expect(screen.getByText(/agent policy.*has been created/i)).toBeInTheDocument();
      expect(screen.queryByTestId('agent-policy-integration-form')).not.toBeInTheDocument();
      expect(screen.getByTestId('agentBasedSection-addAnotherAgentButton')).toBeInTheDocument();
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => expect(radio).toBeDisabled());
    });
  });

  // §A — Resume credential gate and callout
  describe('Next readiness — resume in existing mode', () => {
    it('static_keys: Next is disabled on resume until credentials entered', async () => {
      const onNextReadyChange = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['p1'],
        agentCredentialMethod: 'static_keys',
        isEditMode: true,
      });
      renderSection({ onNextReadyChange });
      await waitFor(() => {
        // Last call must be false — policies selected but no credentials yet
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(false);
      });
      // Simulate credential form signalling ready
      fireEvent.click(screen.getByText('mark-credential-ready'));
      await waitFor(() => {
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(true);
      });
    });

    it('temporary_keys: Next is disabled on resume until credentials entered', async () => {
      const onNextReadyChange = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['p1'],
        agentCredentialMethod: 'temporary_keys',
        isEditMode: true,
      });
      renderSection({ onNextReadyChange });
      await waitFor(() => {
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(false);
      });
      fireEvent.click(screen.getByText('mark-temp-credential-ready'));
      await waitFor(() => {
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(true);
      });
    });

    it('assume_role with persisted roleArn: Next is enabled immediately on resume', async () => {
      const onNextReadyChange = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['p1'],
        agentCredentialMethod: 'assume_role',
        roleArn: 'arn:aws:iam::123456789012:role/MyRole',
        isEditMode: true,
      });
      renderSection({ onNextReadyChange });
      await waitFor(() => {
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(true);
      });
    });

    it('shared_credentials with persisted credentialProfileName: Next is enabled immediately on resume', async () => {
      const onNextReadyChange = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['p1'],
        agentCredentialMethod: 'shared_credentials',
        credentialProfileName: 'my-profile',
        isEditMode: true,
      });
      renderSection({ onNextReadyChange });
      await waitFor(() => {
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(true);
      });
    });

    it('shared_credentials: entering only a profile name (no file) enables Next', async () => {
      const onNextReadyChange = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['p1'],
        agentCredentialMethod: 'shared_credentials',
        // No persisted values — form starts empty.
      });
      renderSection({ onNextReadyChange });
      await waitFor(() => {
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(false);
      });
      fireEvent.click(screen.getByText('set-profile-name'));
      await waitFor(() => {
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(true);
      });
    });

    it('shared_credentials: clearing the last shared-credential file disables Next', async () => {
      const onNextReadyChange = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['p1'],
        agentCredentialMethod: 'shared_credentials',
        // File pre-populated, no profile name.
      });
      renderSection({ onNextReadyChange });
      // Set a file first so Next is enabled.
      fireEvent.click(screen.getByText('set-shared-file'));
      await waitFor(() => {
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(true);
      });
      // Now clear the file — Next must go back to false (no profile name either).
      fireEvent.click(screen.getByText('clear-shared-file'));
      await waitFor(() => {
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(false);
      });
    });

    it('no policies selected: Next remains disabled even when credentials are ready', async () => {
      const onNextReadyChange = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: [],
        agentCredentialMethod: 'static_keys',
        isEditMode: true,
      });
      renderSection({ onNextReadyChange });
      fireEvent.click(screen.getByText('mark-credential-ready'));
      await waitFor(() => {
        expect(onNextReadyChange.mock.calls.at(-1)?.[0]).toBe(false);
      });
    });

    it('shows resume callout when in edit mode and credentials not ready', async () => {
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['p1'],
        agentCredentialMethod: 'static_keys',
        isEditMode: true,
      });
      renderSection();
      await waitFor(() => {
        expect(
          screen.getByTestId('agentBasedSection-resumeCredentialsCallout')
        ).toBeInTheDocument();
      });
    });

    it('hides resume callout once credentials are entered', async () => {
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['p1'],
        agentCredentialMethod: 'static_keys',
        isEditMode: true,
      });
      renderSection();
      await waitFor(() =>
        expect(screen.getByTestId('agentBasedSection-resumeCredentialsCallout')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByText('mark-credential-ready'));
      await waitFor(() => {
        expect(
          screen.queryByTestId('agentBasedSection-resumeCredentialsCallout')
        ).not.toBeInTheDocument();
      });
    });

    it('does not show resume callout outside edit mode', async () => {
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['p1'],
        agentCredentialMethod: 'static_keys',
        isEditMode: false,
      });
      renderSection();
      await waitFor(() => {
        expect(
          screen.queryByTestId('agentBasedSection-resumeCredentialsCallout')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('selectedAgentPolicyIds reconciliation after policies load', () => {
    it('filters out deleted/managed policy ids from selectedAgentPolicyIds when policies load', async () => {
      const setAgentBasedDeployment = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['valid-policy', 'deleted-policy'],
        setAgentBasedDeployment,
      });
      // Only 'valid-policy' exists in loaded options; 'deleted-policy' has been removed.
      mockUseGetAgentPoliciesQuery.mockReturnValue({
        data: {
          items: [
            {
              id: 'valid-policy',
              name: 'Valid Policy',
              is_managed: false,
              has_fleet_server: false,
            },
          ],
        },
        isLoading: false,
        isError: false,
      });
      renderSection();
      await waitFor(() => {
        expect(setAgentBasedDeployment).toHaveBeenCalledWith(
          expect.objectContaining({ selectedAgentPolicyIds: ['valid-policy'] })
        );
      });
    });

    it('does not call setAgentBasedDeployment when all ids are still valid', async () => {
      const setAgentBasedDeployment = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['policy-a', 'policy-b'],
        setAgentBasedDeployment,
      });
      mockUseGetAgentPoliciesQuery.mockReturnValue({
        data: {
          items: [
            { id: 'policy-a', name: 'Policy A', is_managed: false, has_fleet_server: false },
            { id: 'policy-b', name: 'Policy B', is_managed: false, has_fleet_server: false },
          ],
        },
        isLoading: false,
        isError: false,
      });
      renderSection();
      await waitFor(() => {
        // setAgentBasedDeployment may be called for other reasons (e.g. form state),
        // but must NOT be called with selectedAgentPolicyIds when no ids were removed.
        const calls = setAgentBasedDeployment.mock.calls.filter(
          (c) => c[0]?.selectedAgentPolicyIds !== undefined
        );
        expect(calls).toHaveLength(0);
      });
    });

    it('does not reconcile when policies are still loading', async () => {
      const setAgentBasedDeployment = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['policy-a'],
        setAgentBasedDeployment,
      });
      mockUseGetAgentPoliciesQuery.mockReturnValue({ data: undefined, isLoading: true });
      renderSection();
      // Wait a tick to confirm no reconciliation fires during loading.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const reconciliationCalls = setAgentBasedDeployment.mock.calls.filter(
        (c) => c[0]?.selectedAgentPolicyIds !== undefined
      );
      expect(reconciliationCalls).toHaveLength(0);
    });

    it('does not reconcile when the policy query errors — retains persisted ids so a transient API failure does not wipe the selection', async () => {
      const setAgentBasedDeployment = jest.fn();
      setupMocks({
        agentHostsMode: 'existing',
        selectedAgentPolicyIds: ['policy-a'],
        setAgentBasedDeployment,
      });
      // React Query sets isLoading:false + isError:true when the request fails; data stays undefined.
      mockUseGetAgentPoliciesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });
      renderSection();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const reconciliationCalls = setAgentBasedDeployment.mock.calls.filter(
        (c) => c[0]?.selectedAgentPolicyIds !== undefined
      );
      expect(reconciliationCalls).toHaveLength(0);
    });

    it('does not reconcile when not in existing mode', async () => {
      const setAgentBasedDeployment = jest.fn();
      setupMocks({
        agentHostsMode: 'new',
        selectedAgentPolicyIds: [],
        setAgentBasedDeployment,
      });
      mockUseGetAgentPoliciesQuery.mockReturnValue({
        data: { items: [] },
        isLoading: false,
      });
      renderSection();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const reconciliationCalls = setAgentBasedDeployment.mock.calls.filter(
        (c) => c[0]?.selectedAgentPolicyIds !== undefined
      );
      expect(reconciliationCalls).toHaveLength(0);
    });
  });

  describe('section accordion never auto-collapses', () => {
    it('when isDone transitions false→true, section content stays visible (autoCollapse=false)', () => {
      const { rerender } = renderSection({ isDone: false });
      expect(screen.getByTestId('static-keys-form')).toBeInTheDocument();

      act(() => {
        rerender(
          <I18nProvider>
            <React.Suspense fallback={null}>
              <AgentBasedSection
                serviceCount={2}
                onDeploy={jest.fn()}
                isDeploying={false}
                isDone={true}
                hasFailed={false}
                failedInstances={[]}
                deployErrors={undefined}
              />
            </React.Suspense>
          </I18nProvider>
        );
      });

      expect(screen.getByTestId('agentBasedSection-whereToAddPanel')).toBeInTheDocument();
    });
  });
});
