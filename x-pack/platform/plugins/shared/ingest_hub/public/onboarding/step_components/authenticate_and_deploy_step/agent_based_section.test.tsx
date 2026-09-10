/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyAgentEnrollmentFlyout: jest.fn(),
  LazyAwsStaticKeysForm: jest.fn(),
  LazyAwsTemporaryKeysForm: jest.fn(),
  useGetAgentPoliciesQuery: jest.fn(),
}));

jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

import {
  LazyAgentEnrollmentFlyout,
  LazyAwsStaticKeysForm,
  LazyAwsTemporaryKeysForm,
  useGetAgentPoliciesQuery,
} from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../../onboarding_flow_context';

const MockAgentEnrollmentFlyout = LazyAgentEnrollmentFlyout as unknown as jest.Mock;
const MockStaticKeysForm = LazyAwsStaticKeysForm as unknown as jest.Mock;
const MockTemporaryKeysForm = LazyAwsTemporaryKeysForm as unknown as jest.Mock;
const mockUseGetAgentPoliciesQuery = useGetAgentPoliciesQuery as jest.Mock;
const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { AgentBasedSection } from './agent_based_section';

interface OnboardingFlowOptions {
  agentHostsMode?: 'new' | 'existing';
  agentPolicyId?: string;
  selectedAgentPolicyIds?: string[];
  agentCredentialMethod?:
    | 'direct_access_keys'
    | 'temporary_keys'
    | 'shared_credentials'
    | 'assume_role';
  setAgentBasedDeployment?: jest.Mock;
}

function setupMocks({
  agentHostsMode = 'new',
  agentPolicyId = undefined,
  selectedAgentPolicyIds = [],
  agentCredentialMethod = 'direct_access_keys',
  setAgentBasedDeployment = jest.fn(),
}: OnboardingFlowOptions = {}) {
  MockAgentEnrollmentFlyout.mockImplementation(() => (
    <div data-test-subj="agent-enrollment-flyout" />
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

  mockUseGetAgentPoliciesQuery.mockReturnValue({ data: { items: [] }, isLoading: false });

  mockUseOnboardingFlow.mockReturnValue({
    agentBasedDeployment: {
      agentHostsMode,
      agentPolicyId,
      selectedAgentPolicyIds,
      agentCredentialMethod,
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

  describe('pre-deploy state — new policy mode', () => {
    it('shows "Create a new agent policy" radio selected by default', () => {
      renderSection();
      const radio = screen.getByRole('radio', { name: /create a new agent policy/i });
      expect(radio).toBeChecked();
    });

    it('shows pre-deploy description ("A new agent policy will be created for you")', () => {
      renderSection();
      expect(screen.getByText(/a new agent policy will be created for you/i)).toBeInTheDocument();
    });

    it('does NOT show post-deploy description', () => {
      renderSection();
      expect(
        screen.queryByText(/a new agent policy is created for this integration/i)
      ).not.toBeInTheDocument();
    });

    it('"Add agent" button is disabled when credential form not ready', () => {
      renderSection();
      expect(screen.getByTestId('agentBasedSection-addAgentButton')).toBeDisabled();
    });

    it('"Add agent" button enables when LazyAwsStaticKeysForm calls onReadyChange(true)', () => {
      renderSection();
      act(() => {
        fireEvent.click(screen.getByText('mark-credential-ready'));
      });
      expect(screen.getByTestId('agentBasedSection-addAgentButton')).not.toBeDisabled();
    });

    it('clicking "Deploy integrations" calls onDeploy', () => {
      const onDeploy = jest.fn();
      renderSection({ onDeploy });
      act(() => {
        fireEvent.click(screen.getByText('mark-credential-ready'));
      });
      fireEvent.click(screen.getByTestId('agentBasedSection-addAgentButton'));
      expect(onDeploy).toHaveBeenCalledTimes(1);
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

    it('"Add agent" button is disabled when no policies selected (selectedAgentPolicyIds=[])', () => {
      renderSection();
      // mark credentials ready first
      act(() => {
        fireEvent.click(screen.getByText('mark-credential-ready'));
      });
      expect(screen.getByTestId('agentBasedSection-addAgentButton')).toBeDisabled();
    });
  });

  describe('post-deploy — new policy mode', () => {
    beforeEach(() => {
      setupMocks({ agentHostsMode: 'new', agentPolicyId: 'policy-123' });
    });

    it('shows post-deploy description ("A new Agent Policy is created for this integration")', () => {
      renderSection();
      expect(
        screen.getByText(/a new agent policy is created for this integration/i)
      ).toBeInTheDocument();
    });

    it('does NOT show pre-deploy description', () => {
      renderSection();
      expect(
        screen.queryByText(/a new agent policy will be created for you/i)
      ).not.toBeInTheDocument();
    });

    it('shows "Add agent" button enabled (isDeployedForCurrentMode=true)', () => {
      renderSection();
      const btn = screen.getByTestId('agentBasedSection-addAgentButton');
      expect(btn).toBeInTheDocument();
      expect(btn).not.toBeDisabled();
    });

    it('clicking "Add agent" opens the flyout directly (no onDeploy call)', () => {
      const onDeploy = jest.fn();
      renderSection({ onDeploy });
      fireEvent.click(screen.getByTestId('agentBasedSection-addAgentButton'));
      expect(onDeploy).not.toHaveBeenCalled();
      expect(screen.getByTestId('agent-enrollment-flyout')).toBeInTheDocument();
    });

    it('does NOT show "+ Add another agent" button', () => {
      renderSection();
      expect(
        screen.queryByTestId('agentBasedSection-addAnotherAgentButton')
      ).not.toBeInTheDocument();
    });
  });

  describe('radio always interactive', () => {
    it('radio buttons are not disabled when agentPolicyId is set', () => {
      setupMocks({ agentHostsMode: 'new', agentPolicyId: 'policy-123' });
      renderSection();
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).not.toBeDisabled();
      });
    });

    it('radio onChange calls setAgentBasedDeployment', () => {
      const setAgentBasedDeployment = jest.fn();
      setupMocks({ agentHostsMode: 'new', setAgentBasedDeployment });
      renderSection();
      fireEvent.click(screen.getByRole('radio', { name: /use an existing agent policy/i }));
      expect(setAgentBasedDeployment).toHaveBeenCalledWith({ agentHostsMode: 'existing' });
    });
  });

  describe('isDeployedForCurrentMode mode switching', () => {
    it('after switching from "new" (with agentPolicyId set) to "existing", pre-deploy combobox appears', () => {
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
