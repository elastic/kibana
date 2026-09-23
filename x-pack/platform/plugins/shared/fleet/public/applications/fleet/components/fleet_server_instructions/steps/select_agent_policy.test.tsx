/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  sendCreateEnrollmentAPIKey,
  sendGetEnrollmentAPIKeys,
  useStartServices,
} from '../../../hooks';
import { createFleetTestRendererMock } from '../../../../../mock';
import type { EnrollmentSettingsFleetServerPolicy } from '../../../types';

import { getSelectAgentPolicyStep } from './select_agent_policy';

// Variables prefixed with 'mock' are exempted from babel-jest's TDZ guard for hoisted jest.mock factories
const mockSendGetEnrollmentAPIKeys = jest.fn();
const mockSendCreateEnrollmentAPIKey = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

// Blanket-mock the hooks module so we control exactly what each hook returns.
// Note: jest.requireActual is avoided because loading the full hooks module triggers
// a circular dependency through fleet/app.tsx → mock/create_test_renderer.tsx → this file.
jest.mock('../../../hooks');

// Stub out SelectCreateAgentPolicy via its barrel export so the barrel itself is replaced.
// A leaf-module mock on agent_policy_select_create does not propagate reliably through
// the re-export chain in the Jest module registry, but replacing the barrel directly works.
jest.mock('../..', () => ({
  SelectCreateAgentPolicy: ({
    selectedPolicyId,
    setSelectedPolicyId,
  }: {
    selectedPolicyId?: string;
    setSelectedPolicyId: (id?: string) => void;
  }) => (
    <div data-test-subj="selectCreateAgentPolicy">
      <span>{selectedPolicyId ?? 'no-policy'}</span>
      <button data-test-subj="selectPolicy" onClick={() => setSelectedPolicyId('policy-1')}>
        Select Policy
      </button>
    </div>
  ),
}));

const POLICIES: EnrollmentSettingsFleetServerPolicy[] = [
  { id: 'policy-1', name: 'Fleet Server Policy', is_managed: false },
];

// Two-policy list: prevents auto-selection of the first policy when no policyId is set
const POLICIES_MULTI: EnrollmentSettingsFleetServerPolicy[] = [
  { id: 'policy-1', name: 'Fleet Server Policy', is_managed: false },
  { id: 'policy-2', name: 'Fleet Server Policy 2', is_managed: false },
];

const makeKey = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  api_key_id: `${id}-key`,
  api_key: 'secret',
  name: id,
  active: true,
  policy_id: 'policy-1',
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

// Renders step children via a stateful wrapper so policyId changes propagate
const Harness: React.FunctionComponent<{
  initialPolicyId?: string;
  policies?: EnrollmentSettingsFleetServerPolicy[];
}> = ({ initialPolicyId, policies = POLICIES }) => {
  const [policyId, setPolicyId] = useState<string | undefined>(initialPolicyId);
  const step = getSelectAgentPolicyStep({
    policyId,
    setPolicyId,
    eligibleFleetServerPolicies: policies,
    refreshEligibleFleetServerPolicies: jest.fn(),
  });
  return <>{step.children}</>;
};

describe('getSelectAgentPolicyStep — enrollment token callout', () => {
  // Use HookWrapper (not AppWrapper) so FleetAppContext is not rendered.
  // AppWrapper includes FleetAppContext which calls hooks that are auto-mocked to
  // jest.fn() by the blanket jest.mock('../../../hooks') above, causing a render crash.
  const renderWithHookWrapper = (ui: React.ReactElement) => {
    const testRenderer = createFleetTestRendererMock();
    return testRenderer.render(ui, { wrapper: testRenderer.HookWrapper });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(useStartServices).mockReturnValue({
      notifications: {
        toasts: { addSuccess: mockAddSuccess, addError: mockAddError },
      },
    } as unknown as ReturnType<typeof useStartServices>);

    // Route auto-mock calls through the 'mock'-prefixed outer variables so we can
    // configure return values per-test with mockResolvedValue on those variables.
    jest.mocked(sendGetEnrollmentAPIKeys).mockImplementation(mockSendGetEnrollmentAPIKeys);
    jest.mocked(sendCreateEnrollmentAPIKey).mockImplementation(mockSendCreateEnrollmentAPIKey);
  });

  it('does not show the callout when no policy is selected', () => {
    // Use multiple policies so the auto-select effect (eligiblePolicies.length === 1) does not fire
    const { queryByText } = renderWithHookWrapper(<Harness policies={POLICIES_MULTI} />);

    expect(mockSendGetEnrollmentAPIKeys).not.toHaveBeenCalled();
    expect(
      queryByText('There are no enrollment tokens for the selected Fleet Server policy')
    ).toBeNull();
  });

  it('does not show the callout when the selected policy has active enrollment tokens', async () => {
    mockSendGetEnrollmentAPIKeys.mockResolvedValue({
      data: { items: [makeKey('active-token')] },
    });

    const { queryByText } = renderWithHookWrapper(<Harness initialPolicyId="policy-1" />);

    await waitFor(() => expect(mockSendGetEnrollmentAPIKeys).toHaveBeenCalled());
    expect(mockSendGetEnrollmentAPIKeys).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'policy_id:"policy-1"' })
    );
    expect(
      queryByText('There are no enrollment tokens for the selected Fleet Server policy')
    ).toBeNull();
  });

  it('shows the callout and create button when the selected policy has no enrollment tokens', async () => {
    mockSendGetEnrollmentAPIKeys.mockResolvedValue({ data: { items: [] } });

    const { getByText } = renderWithHookWrapper(<Harness initialPolicyId="policy-1" />);

    await waitFor(() =>
      expect(
        getByText('There are no enrollment tokens for the selected Fleet Server policy')
      ).toBeInTheDocument()
    );
    expect(getByText('Create enrollment token')).toBeInTheDocument();
    // Confirms server-side policy scoping is applied
    expect(mockSendGetEnrollmentAPIKeys).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'policy_id:"policy-1"' })
    );
  });

  it('does not show the callout when the token lookup fails', async () => {
    const fetchError = new Error('network error');
    mockSendGetEnrollmentAPIKeys.mockResolvedValue({ error: fetchError });

    const { queryByText } = renderWithHookWrapper(<Harness initialPolicyId="policy-1" />);

    await waitFor(() => expect(mockSendGetEnrollmentAPIKeys).toHaveBeenCalled());
    // Error → lookupStatus stays 'error', callout must not appear
    await waitFor(() =>
      expect(
        queryByText('There are no enrollment tokens for the selected Fleet Server policy')
      ).toBeNull()
    );
    expect(mockAddError).toHaveBeenCalled();
  });

  it('creates a token, shows a success toast, and hides the callout on button click', async () => {
    mockSendGetEnrollmentAPIKeys.mockResolvedValue({ data: { items: [] } });
    mockSendCreateEnrollmentAPIKey.mockResolvedValue({
      data: { item: makeKey('new-token') },
    });

    const { getByText, queryByText } = renderWithHookWrapper(
      <Harness initialPolicyId="policy-1" />
    );

    await waitFor(() =>
      expect(
        getByText('There are no enrollment tokens for the selected Fleet Server policy')
      ).toBeInTheDocument()
    );

    await userEvent.click(getByText('Create enrollment token'));

    await waitFor(() =>
      expect(
        queryByText('There are no enrollment tokens for the selected Fleet Server policy')
      ).toBeNull()
    );
    expect(mockAddSuccess).toHaveBeenCalledWith('Enrollment token created');
    expect(mockSendCreateEnrollmentAPIKey).toHaveBeenCalledWith({ policy_id: 'policy-1' });
  });

  it('shows an error toast and keeps callout visible when token creation fails', async () => {
    mockSendGetEnrollmentAPIKeys.mockResolvedValue({ data: { items: [] } });
    const creationError = new Error('creation failed');
    mockSendCreateEnrollmentAPIKey.mockResolvedValue({ error: creationError });

    const { getByText } = renderWithHookWrapper(<Harness initialPolicyId="policy-1" />);

    await waitFor(() =>
      expect(
        getByText('There are no enrollment tokens for the selected Fleet Server policy')
      ).toBeInTheDocument()
    );

    await userEvent.click(getByText('Create enrollment token'));

    await waitFor(() => expect(mockAddError).toHaveBeenCalled());
    // Callout stays visible after a failed create
    expect(
      getByText('There are no enrollment tokens for the selected Fleet Server policy')
    ).toBeInTheDocument();
  });

  it('shows the callout when policy is selected via the selector and has no tokens', async () => {
    mockSendGetEnrollmentAPIKeys.mockResolvedValue({ data: { items: [] } });

    const { getByTestId, getByText } = renderWithHookWrapper(<Harness />);

    // Trigger policy selection via the stub button
    await userEvent.click(getByTestId('selectPolicy'));

    await waitFor(() =>
      expect(
        getByText('There are no enrollment tokens for the selected Fleet Server policy')
      ).toBeInTheDocument()
    );
  });
});
