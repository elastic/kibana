/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { fireEvent, waitFor } from '@testing-library/react';

import { EuiContextMenuItem } from '@elastic/eui';

import type { AgentPolicy, PackagePolicy } from '../../../types';
import { createFleetTestRendererMock } from '../../../../../mock';

import {
  sendGetAgents,
  useMultipleAgentPolicies,
  useDeleteAgentPolicyMutation,
} from '../../../hooks';

import { AgentPolicyDeleteProvider } from './agent_policy_delete_provider';

jest.mock('../../../hooks', () => {
  return {
    ...jest.requireActual('../../../hooks'),
    useMultipleAgentPolicies: jest.fn(),
    useStartServices: jest.fn().mockReturnValue({
      notifications: {
        toasts: { addSuccess: jest.fn(), addDanger: jest.fn() },
      },
    }),
    useLink: jest.fn().mockReturnValue({ getPath: jest.fn().mockReturnValue('/policies') }),
    useConfig: jest.fn().mockReturnValue({
      agents: { enabled: true },
    }),
    sendGetAgents: jest.fn(),
    useDeleteAgentPolicyMutation: jest.fn(),
  };
});

const useMultipleAgentPoliciesMock = useMultipleAgentPolicies as jest.MockedFunction<
  typeof useMultipleAgentPolicies
>;
const sendGetAgentsMock = sendGetAgents as jest.MockedFunction<typeof sendGetAgents>;
const useDeleteAgentPolicyMutationMock = useDeleteAgentPolicyMutation as jest.MockedFunction<
  typeof useDeleteAgentPolicyMutation
>;

const POLICY_NAME = 'My production policy';

function createAgentPolicy(props: Partial<AgentPolicy> = {}): AgentPolicy {
  return {
    id: 'agent-policy-1',
    namespace: 'default',
    monitoring_enabled: [],
    name: POLICY_NAME,
    description: '',
    is_preconfigured: false,
    status: 'active',
    is_managed: false,
    revision: 1,
    updated_at: '',
    updated_by: 'elastic',
    package_policies: [],
    is_protected: false,
    ...props,
  };
}

function renderMenu({
  agentPolicy,
  packagePolicies,
  hasFleetServer = false,
}: {
  agentPolicy: AgentPolicy;
  packagePolicies?: PackagePolicy[];
  hasFleetServer?: boolean;
}) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(
    <AgentPolicyDeleteProvider
      agentPolicy={agentPolicy}
      packagePolicies={packagePolicies}
      hasFleetServer={hasFleetServer}
    >
      {(deleteAgentPolicyPrompt) => (
        <EuiContextMenuItem
          onClick={() => deleteAgentPolicyPrompt(agentPolicy.id)}
          data-test-subj="deletePolicyBtn"
        >
          Delete policy
        </EuiContextMenuItem>
      )}
    </AgentPolicyDeleteProvider>
  );

  return { utils };
}

const openModal = async (utils: ReturnType<typeof renderMenu>['utils']) => {
  fireEvent.click(utils.getByTestId('deletePolicyBtn'));
  // wait for the async agents count fetch to settle (confirm button leaves its "Loading…" state)
  await waitFor(() => {
    expect(utils.getByTestId('confirmModalConfirmButton')).toHaveTextContent('Delete policy');
  });
};

const mutateAsyncMock = jest.fn();

describe('AgentPolicyDeleteProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMultipleAgentPoliciesMock.mockReturnValue({ canUseMultipleAgentPolicies: false });
    mutateAsyncMock.mockResolvedValue({ data: { id: 'agent-policy-1', name: POLICY_NAME } });
    useDeleteAgentPolicyMutationMock.mockReturnValue({ mutateAsync: mutateAsyncMock } as any);
    sendGetAgentsMock.mockResolvedValue({
      data: { statusSummary: {}, items: [], total: 0 },
    } as any);
  });

  it('displays the policy name in the modal title', async () => {
    const { utils } = renderMenu({ agentPolicy: createAgentPolicy() });
    await openModal(utils);

    expect(utils.getByTestId('confirmModalTitleText').textContent).toContain(POLICY_NAME);
  });

  it('shows a consolidated "cannot be undone" warning banner naming the policy', async () => {
    const packagePolicies = [{ name: 'nginx-1', policy_ids: ['agent-policy-1'] } as PackagePolicy];
    const { utils } = renderMenu({ agentPolicy: createAgentPolicy(), packagePolicies });
    await openModal(utils);

    const callout = utils.getByTestId('deleteAgentPolicyWarningCallout');
    expect(callout.textContent).toContain('This action cannot be undone');
    expect(callout.textContent).toContain(POLICY_NAME);
  });

  describe('trivial (empty) policy', () => {
    it('does not require typing the name and allows immediate deletion', async () => {
      const { utils } = renderMenu({ agentPolicy: createAgentPolicy(), packagePolicies: [] });
      await openModal(utils);

      expect(utils.queryByTestId('deleteAgentPolicyNameConfirmationInput')).not.toBeInTheDocument();
      const confirmButton = utils.getByTestId('confirmModalConfirmButton');
      expect(confirmButton).not.toBeDisabled();

      fireEvent.click(confirmButton);
      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({ agentPolicyId: 'agent-policy-1' });
      });
    });
  });

  describe('policy with integrations but no active agents', () => {
    const packagePolicies = [{ name: 'nginx-1', policy_ids: ['agent-policy-1'] } as PackagePolicy];

    it('requires typing the exact policy name to enable deletion', async () => {
      const { utils } = renderMenu({ agentPolicy: createAgentPolicy(), packagePolicies });
      await openModal(utils);

      const input = utils.getByTestId('deleteAgentPolicyNameConfirmationInput');
      const confirmButton = utils.getByTestId('confirmModalConfirmButton');

      // disabled until the name is typed
      expect(confirmButton).toBeDisabled();

      // wrong name keeps it disabled
      fireEvent.change(input, { target: { value: 'wrong name' } });
      expect(confirmButton).toBeDisabled();

      // correct name (with surrounding whitespace) enables it
      fireEvent.change(input, { target: { value: `  ${POLICY_NAME}  ` } });
      expect(confirmButton).not.toBeDisabled();

      fireEvent.click(confirmButton);
      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({ agentPolicyId: 'agent-policy-1' });
      });
    });
  });

  describe('policy with active agents (non-agentless)', () => {
    beforeEach(() => {
      sendGetAgentsMock.mockResolvedValue({
        data: { statusSummary: {}, items: [{ id: 'agent-1' }], total: 3 },
      } as any);
    });

    it('blocks deletion and shows the affected agents count without a confirmation input', async () => {
      const { utils } = renderMenu({ agentPolicy: createAgentPolicy() });
      await openModal(utils);

      const callout = utils.getByTestId('deleteAgentPolicyAgentsInUseCallout');
      expect(callout.textContent).toContain('3 agents are');

      expect(utils.queryByTestId('deleteAgentPolicyNameConfirmationInput')).not.toBeInTheDocument();
      expect(utils.getByTestId('confirmModalConfirmButton')).toBeDisabled();
    });
  });

  describe('agentless policy with agents', () => {
    beforeEach(() => {
      sendGetAgentsMock.mockResolvedValue({
        data: { statusSummary: {}, items: [{ id: 'agent-1' }], total: 1 },
      } as any);
    });

    it('is not blocked and requires typing the name to confirm', async () => {
      const { utils } = renderMenu({
        agentPolicy: createAgentPolicy({ supports_agentless: true }),
      });
      await openModal(utils);

      const input = utils.getByTestId('deleteAgentPolicyNameConfirmationInput');
      const confirmButton = utils.getByTestId('confirmModalConfirmButton');
      expect(confirmButton).toBeDisabled();

      fireEvent.change(input, { target: { value: POLICY_NAME } });
      expect(confirmButton).not.toBeDisabled();
    });
  });

  it('shows a warning when integration policies are shared across multiple agent policies', async () => {
    useMultipleAgentPoliciesMock.mockReturnValue({ canUseMultipleAgentPolicies: true });
    const packagePolicies = [
      { name: 'nginx-1', policy_ids: ['agent-policy-1', 'agent-policy-2'] } as PackagePolicy,
    ];
    const { utils } = renderMenu({ agentPolicy: createAgentPolicy(), packagePolicies });
    await openModal(utils);

    expect(
      utils.getByTestId('deleteAgentPolicySharedIntegrationPoliciesCallout')
    ).toBeInTheDocument();
  });

  it('shows the Fleet Server note when the policy has a Fleet Server integration', async () => {
    const packagePolicies = [
      { name: 'fleet_server-1', policy_ids: ['agent-policy-1'] } as PackagePolicy,
    ];
    const { utils } = renderMenu({
      agentPolicy: createAgentPolicy(),
      packagePolicies,
      hasFleetServer: true,
    });
    await openModal(utils);

    expect(utils.getByText(/This policy has Fleet Server integration/i)).toBeInTheDocument();
  });

  it('closes the modal on cancel without deleting', async () => {
    const { utils } = renderMenu({ agentPolicy: createAgentPolicy() });
    await openModal(utils);

    fireEvent.click(utils.getByTestId('confirmModalCancelButton'));
    await waitFor(() => {
      expect(utils.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });
});
