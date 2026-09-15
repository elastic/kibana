/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

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

import {
  LazyAgentEnrollmentFlyout,
  LazyAwsStaticKeysForm,
  LazyAwsTemporaryKeysForm,
  LazyAgentPolicyIntegrationForm,
  useGetAgentPoliciesQuery,
  agentPolicyFormValidation,
} from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';

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
  agentCredentialMethod?:
    | 'direct_access_keys'
    | 'temporary_keys'
    | 'shared_credentials'
    | 'assume_role';
  withSysMonitoring?: boolean;
  setAgentBasedDeployment?: jest.Mock;
}

function setupMocks({
  agentHostsMode = 'new',
  agentPolicyId = undefined,
  agentPolicyName = undefined,
  selectedAgentPolicyIds = [],
  agentCredentialMethod = 'direct_access_keys',
  withSysMonitoring = undefined,
  setAgentBasedDeployment = jest.fn(),
}: OnboardingFlowOptions = {}) {
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
    },
    setAgentBasedDeployment,
  });
}

interface RenderOptions {
  serviceCount?: number;
  onDeploy?: jest.Mock;
  isDeploying?: boolean;
  isDone?: boolean;
  hasFailed?: boolean;
  failedInstances?: string[];
  deployErrors?: Record<string, string> | undefined;
}

function renderSection(props: RenderOptions = {}) {
  const onDeploy = props.onDeploy ?? jest.fn();
  return render(
    <I18nProvider>
      <React.Suspense fallback={null}>
        <AgentBasedSection
          serviceCount={props.serviceCount ?? 2}
          onDeploy={onDeploy}
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
