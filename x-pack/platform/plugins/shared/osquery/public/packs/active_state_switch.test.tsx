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

jest.mock('../agent_policies/use_agent_policies', () => ({
  useAgentPolicies: () => ({
    data: {
      agentPoliciesById: {
        'policy-with-agents': { id: 'policy-with-agents', agents: 3 },
        'policy-no-agents': { id: 'policy-no-agents', agents: 0 },
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

  it('disables the toggle regardless of policy count when the user lacks writePacks permission', () => {
    mockWritePacks = false;
    renderSwitch(basePack({ enabled: false, policy_ids: ['policy-with-agents'] }));

    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
