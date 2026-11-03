/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ search: '' }),
}));

jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyAgentEnrollmentFlyout: () => null,
  LazyAwsStaticKeysForm: () => null,
  LazyAwsTemporaryKeysForm: () => null,
  useGetAgentPoliciesQuery: () => ({ data: undefined, isLoading: false, isError: false }),
  agentPolicyFormValidation: () => ({}),
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE: 'ingest-agent-policies',
}));

jest.mock('../../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('../agent_based_deploy/agent_policy_name', () => ({
  buildAgentPolicyName: async () => 'mock-policy-name',
}));

jest.mock('../section_accordion', () => ({
  DeploymentModeAccordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('./credential_method_selector', () => ({
  CredentialMethodSelector: () => null,
}));

jest.mock('./shared_credentials_form', () => ({
  SharedCredentialsForm: () => null,
}));

jest.mock('./assume_role_form', () => ({
  AssumeRoleForm: () => null,
}));

jest.mock('./agent_policy_panel', () => ({
  AgentPolicyPanel: () => null,
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { useOnboardingFlow } from '../../../onboarding_flow_context';
import { AgentBasedSection } from '.';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;

const makeDefaultAgentBasedDeployment = () => ({
  agentHostsMode: 'new' as const,
  agentPolicyId: undefined,
  selectedAgentPolicyIds: [],
  agentCredentialMethod: 'static_keys',
  sharedCredentialFile: '',
  credentialProfileName: '',
  roleArn: '',
  agentPolicyName: 'test-policy',
  withSysMonitoring: false,
});

function setup(props: Partial<React.ComponentProps<typeof AgentBasedSection>> = {}) {
  mockUseOnboardingFlow.mockReturnValue({
    agentBasedDeployment: makeDefaultAgentBasedDeployment(),
    setAgentBasedDeployment: jest.fn(),
    detectAndReviewStep: { policyIdsByInstance: {} },
  });

  return render(
    <I18nProvider>
      <AgentBasedSection
        serviceCount={1}
        onDeploy={jest.fn()}
        isDeploying={false}
        isDone={false}
        hasFailed={false}
        failedInstances={[]}
        {...props}
      />
    </I18nProvider>
  );
}

describe('AgentBasedSection — requiresCredentials prop change', () => {
  it('calls onNextReadyChange(true) when requiresCredentials=false and policy form is valid', async () => {
    const onNextReadyChange = jest.fn();
    setup({ requiresCredentials: false, onNextReadyChange });

    await waitFor(() => expect(onNextReadyChange).toHaveBeenCalledWith(true));
  });

  it('re-syncs isCredentialReady when requiresCredentials flips from false to true', async () => {
    const onNextReadyChange = jest.fn();
    const { rerender } = setup({ requiresCredentials: false, onNextReadyChange });

    await waitFor(() => expect(onNextReadyChange).toHaveBeenCalledWith(true));

    mockUseOnboardingFlow.mockReturnValue({
      agentBasedDeployment: makeDefaultAgentBasedDeployment(),
      setAgentBasedDeployment: jest.fn(),
      detectAndReviewStep: { policyIdsByInstance: {} },
    });

    rerender(
      <I18nProvider>
        <AgentBasedSection
          serviceCount={1}
          onDeploy={jest.fn()}
          isDeploying={false}
          isDone={false}
          hasFailed={false}
          failedInstances={[]}
          requiresCredentials={true}
          onNextReadyChange={onNextReadyChange}
        />
      </I18nProvider>
    );

    // After requiresCredentials flips to true, the useEffect re-derives isCredentialReady.
    // With credential method 'static_keys' and no stored credentials, readiness resets to false.
    await waitFor(() => expect(onNextReadyChange).toHaveBeenCalledWith(false));
  });

  it('re-syncs isCredentialReady when requiresCredentials flips from true to false', async () => {
    const onNextReadyChange = jest.fn();
    const { rerender } = setup({ requiresCredentials: true, onNextReadyChange });

    // Initially disabled (credentials required but not entered)
    await waitFor(() => expect(onNextReadyChange).toHaveBeenCalledWith(false));

    rerender(
      <I18nProvider>
        <AgentBasedSection
          serviceCount={1}
          onDeploy={jest.fn()}
          isDeploying={false}
          isDone={false}
          hasFailed={false}
          failedInstances={[]}
          requiresCredentials={false}
          onNextReadyChange={onNextReadyChange}
        />
      </I18nProvider>
    );

    // After requiresCredentials flips to false, isCredentialReady becomes true immediately.
    await waitFor(() => expect(onNextReadyChange).toHaveBeenCalledWith(true));
  });
});
