/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../mock';

import { AgentlessStatusDetailsFlyout } from '.';

jest.mock('../../hooks', () => ({
  ...jest.requireActual('../../hooks'),
  useStartServices: jest.fn().mockReturnValue({
    docLinks: { links: { fleet: { troubleshooting: 'https://elastic.co/docs/troubleshoot' } } },
  }),
}));

// Stub out AgentDetailsIntegration — its internal hooks are not relevant here
jest.mock(
  '../../applications/fleet/sections/agents/agent_details_page/components/agent_details/agent_details_integration',
  () => ({ AgentDetailsIntegration: () => <div data-test-subj="agentDetailsIntegration" /> })
);

const onClose = jest.fn();

function makeAgent(
  unitStatuses: Array<{ inputId: string; status: 'HEALTHY' | 'DEGRADED' | 'FAILED' }>
) {
  return {
    id: 'agent-1',
    status: 'online',
    components: unitStatuses.map(({ inputId, status }, i) => ({
      id: `component-${i}`,
      type: 'logfile',
      status,
      units: [{ id: inputId, type: 'input', status, message: '', payload: {} }],
    })),
  } as any;
}

function makePackagePolicy(inputs: Array<{ id: string }> = [{ id: 'input-1' }]) {
  return {
    id: 'pkg-policy-1',
    name: 'test-policy',
    inputs,
  } as any;
}

function makeAgentPolicy() {
  return { id: 'agent-policy-1', name: 'Agent Policy', package_policies: [] } as any;
}

function renderFlyout({
  agent,
  packagePolicy = makePackagePolicy(),
  agentPolicy = makeAgentPolicy(),
}: {
  agent: ReturnType<typeof makeAgent>;
  packagePolicy?: any;
  agentPolicy?: any;
}) {
  const renderer = createIntegrationsTestRendererMock();
  return renderer.render(
    <AgentlessStatusDetailsFlyout
      onClose={onClose}
      policyName="My Integration"
      agent={agent}
      agentPolicy={agentPolicy}
      packagePolicy={packagePolicy}
    />
  );
}

describe('AgentlessStatusDetailsFlyout', () => {
  it('renders without a callout when all components are healthy', async () => {
    const agent = makeAgent([{ inputId: 'input-1', status: 'HEALTHY' }]);
    const { queryByTestId } = renderFlyout({ agent });
    await waitFor(() => {
      expect(queryByTestId('agentlessStatusDetailsFlyoutComponentsWarning')).toBeNull();
    });
  });

  it('renders a warning callout when a component is degraded', async () => {
    const agent = makeAgent([{ inputId: 'input-1', status: 'DEGRADED' }]);
    const { getByTestId, getByText, queryByText } = renderFlyout({ agent });
    await waitFor(() => {
      expect(getByTestId('agentlessStatusDetailsFlyoutComponentsWarning')).not.toBeNull();
      expect(getByText('One or more components are in a degraded state')).toBeInTheDocument();
      expect(queryByText(/troubleshooting guide/i)).toBeNull();
    });
  });

  it('renders a danger callout with body text when a component is failed', async () => {
    const agent = makeAgent([{ inputId: 'input-1', status: 'FAILED' }]);
    const { getByTestId, getByText } = renderFlyout({ agent });
    await waitFor(() => {
      expect(getByTestId('agentlessStatusDetailsFlyoutComponentsWarning')).not.toBeNull();
      expect(getByText('One or more components are in a failed state')).toBeInTheDocument();
      expect(getByText(/troubleshooting guide/i)).toBeInTheDocument();
    });
  });

  it('treats failed as higher severity than degraded', async () => {
    const agent = makeAgent([
      { inputId: 'input-1', status: 'DEGRADED' },
      { inputId: 'input-1', status: 'FAILED' },
    ]);
    const { getByText } = renderFlyout({ agent });
    await waitFor(() => {
      expect(getByText('One or more components are in a failed state')).toBeInTheDocument();
    });
  });

  it('detects degraded state on a non-first input (multi-input package)', async () => {
    // Only input-2 (the second input) has a degraded unit — the bug the PR review caught
    const agent = makeAgent([{ inputId: 'input-2', status: 'DEGRADED' }]);
    const packagePolicy = makePackagePolicy([{ id: 'input-1' }, { id: 'input-2' }]);
    const { getByText } = renderFlyout({ agent, packagePolicy });
    await waitFor(() => {
      expect(getByText('One or more components are in a degraded state')).toBeInTheDocument();
    });
  });

  it('renders without a callout when agent has no components', async () => {
    const agent = { id: 'agent-1', status: 'online' } as any;
    const { queryByTestId } = renderFlyout({ agent });
    await waitFor(() => {
      expect(queryByTestId('agentlessStatusDetailsFlyoutComponentsWarning')).toBeNull();
    });
  });
});
