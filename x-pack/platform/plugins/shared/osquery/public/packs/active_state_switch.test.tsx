/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';

import { ActiveStateSwitch } from './active_state_switch';
import { queryClient } from '../query_client';
import type { PackSavedObject } from './types';

let mockWritePacks = true;
const mockAddSuccess = jest.fn();
const mockMutateAsync = jest.fn().mockResolvedValue({ data: { name: 'Test Pack', enabled: true } });

jest.mock('../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: {
          osquery: { writePacks: mockWritePacks },
        },
      },
      notifications: { toasts: { addSuccess: mockAddSuccess } },
    },
  }),
}));

const mockAgentPoliciesQueryState = { isFetched: true, isError: false };

jest.mock('../agent_policies/use_agent_policies', () => ({
  useAgentPolicies: () => ({
    ...mockAgentPoliciesQueryState,
    data: {
      agentPoliciesById: {
        'policy-with-agents': { id: 'policy-with-agents', agents: 3 },
        'policy-no-agents': { id: 'policy-no-agents', agents: 0 },
        'shared-a': { id: 'shared-a', agents: 2 },
        'shared-b': { id: 'shared-b', agents: 5 },
        'shared-empty': { id: 'shared-empty', agents: 0 },
      },
      groupsByPackagePolicyId: {
        integration: {
          id: 'integration',
          name: 'Shared hosts',
          policyIds: ['shared-a', 'shared-b', 'shared-empty'],
        },
      },
      groupIdByPolicyId: {
        'shared-a': 'integration',
        'shared-b': 'integration',
        'shared-empty': 'integration',
      },
    },
  }),
}));

jest.mock('./use_update_pack', () => ({
  useUpdatePack: ({ options }: { options?: { onSuccess?: (response: unknown) => void } }) => ({
    isLoading: false,
    mutateAsync: (...args: unknown[]) => {
      const result = mockMutateAsync(...args);

      return result.then((response: unknown) => {
        options?.onSuccess?.(response);

        return response;
      });
    },
  }),
}));

const basePack = (
  overrides: Partial<PackSavedObject> = {}
): PackSavedObject & { policy_ids: string[] } => ({
  saved_object_id: 'pack-1',
  name: 'test-pack',
  description: '',
  queries: {},
  enabled: false,
  created_at: '2024-01-01',
  created_by: 'test-user',
  updated_at: '2024-01-01',
  updated_by: 'test-user',
  policy_ids: [],
  references: [],
  ...overrides,
});

const renderSwitch = (item: PackSavedObject & { policy_ids: string[] }) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ActiveStateSwitch item={item} />
        </QueryClientProvider>
      </IntlProvider>
    </EuiProvider>
  );

describe('ActiveStateSwitch', () => {
  beforeEach(() => {
    mockAgentPoliciesQueryState.isFetched = true;
    mockAgentPoliciesQueryState.isError = false;
    mockWritePacks = true;
    mockMutateAsync.mockClear();
    mockAddSuccess.mockClear();
  });

  it('disables the toggle and blocks mutation for a not-enabled pack with zero policies', async () => {
    renderSwitch(basePack({ enabled: false, policy_ids: [] }));

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();

    fireEvent.click(toggle);

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('shows a tooltip explaining the zero-policy guard on the disabled toggle', async () => {
    renderSwitch(basePack({ enabled: false, policy_ids: [] }));

    const wrapper = screen.getByRole('switch').closest('span');
    expect(wrapper).not.toBeNull();

    fireEvent.mouseOver(wrapper as HTMLElement);

    await waitFor(() =>
      expect(
        screen.getByText('Please assign at least one policy to enable this schedule.')
      ).toBeInTheDocument()
    );
  });

  it('keeps the toggle interactable for an already-enabled pack with zero policies', () => {
    renderSwitch(basePack({ enabled: true, policy_ids: [] }));

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeDisabled();
  });

  it('does not show the zero-policy tooltip when the pack is enabled with zero policies', () => {
    renderSwitch(basePack({ enabled: true, policy_ids: [] }));

    expect(
      screen.queryByText('Please assign at least one policy to enable this schedule.')
    ).not.toBeInTheDocument();
  });

  it('keeps the toggle interactable when the pack has policies, and directly toggles when no agents are assigned', async () => {
    renderSwitch(basePack({ enabled: false, policy_ids: ['policy-no-agents'] }));

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeDisabled();

    fireEvent.click(toggle);

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'pack-1', enabled: true })
    );
  });

  it('shows the confirmation modal instead of toggling directly when the pack has policies with agents', () => {
    renderSwitch(basePack({ enabled: false, policy_ids: ['policy-with-agents'] }));

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeDisabled();

    fireEvent.click(toggle);

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirmModalTitleText')).toBeInTheDocument();
  });

  describe('shared integrations', () => {
    it('counts every agent policy and agent of the shared integration for a disabled partial pack', () => {
      renderSwitch(
        basePack({ enabled: false, policy_ids: ['shared-a'], effective_policy_ids: [] })
      );

      fireEvent.click(screen.getByRole('switch'));

      expect(
        screen.getByText(/This action will update 3 agent policies affecting 7 agents/)
      ).toBeInTheDocument();
    });

    it('shows the confirmation when only an unsaved member of the integration has agents', () => {
      renderSwitch(basePack({ enabled: false, policy_ids: ['shared-empty'] }));

      fireEvent.click(screen.getByRole('switch'));

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(
        screen.getByText(/This action will update 3 agent policies affecting 7 agents/)
      ).toBeInTheDocument();
    });

    it('keeps the toggle disabled until the agent policies have loaded', () => {
      mockAgentPoliciesQueryState.isFetched = false;
      renderSwitch(basePack({ enabled: false, policy_ids: ['shared-empty'] }));

      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();
      fireEvent.click(toggle);
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('asks for confirmation when the agent policies failed to load', () => {
      mockAgentPoliciesQueryState.isFetched = false;
      mockAgentPoliciesQueryState.isError = true;
      renderSwitch(basePack({ enabled: false, policy_ids: ['unknown-policy'] }));

      fireEvent.click(screen.getByRole('switch'));

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(screen.getAllByText('Save and deploy changes').length).toBeGreaterThan(0);
    });

    it('keeps counts unchanged for an unshared pack', () => {
      renderSwitch(basePack({ enabled: false, policy_ids: ['policy-with-agents'] }));

      fireEvent.click(screen.getByRole('switch'));

      expect(
        screen.getByText(/This action will update 1 agent policy affecting 3 agents/)
      ).toBeInTheDocument();
    });
  });

  it('disables the toggle regardless of policy count when the user lacks writePacks permission', () => {
    mockWritePacks = false;
    renderSwitch(basePack({ enabled: false, policy_ids: ['policy-with-agents'] }));

    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
