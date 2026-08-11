/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentRouteGuard } from './agent_route_guard';

const mockUseEffectiveSpaceDefaultAgent = jest.fn();
jest.mock('../../hooks/use_space_default_agent', () => ({
  useEffectiveSpaceDefaultAgent: () => mockUseEffectiveSpaceDefaultAgent(),
}));

let mockPathname = '/agents/agent-a';
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname }),
}));

// Render Navigate as a marker so we can assert redirects without a full router.
jest.mock('react-router-dom-v5-compat', () => ({
  Navigate: ({ to }: { to: string }) => <div>{`navigate:${to}`}</div>,
}));

const Child = () => <div>child-content</div>;

describe('AgentRouteGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/agents/agent-a';
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: null,
      isRestricted: false,
      isReady: true,
    });
  });

  it('redirects a restricted user off a non-default agent to the space default', () => {
    mockPathname = '/agents/other-agent/conversations/xyz';
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: 'siemens-agent',
      isRestricted: true,
      isReady: true,
    });

    render(
      <AgentRouteGuard>
        <Child />
      </AgentRouteGuard>
    );

    expect(screen.queryByText('child-content')).not.toBeInTheDocument();
    expect(screen.getByText(/^navigate:/).textContent).toContain('siemens-agent');
  });

  it('renders children when a restricted user is already on the space default', () => {
    mockPathname = '/agents/siemens-agent';
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: 'siemens-agent',
      isRestricted: true,
      isReady: true,
    });

    render(
      <AgentRouteGuard>
        <Child />
      </AgentRouteGuard>
    );

    expect(screen.getByText('child-content')).toBeInTheDocument();
  });

  it('does not restrict admins / unconfigured spaces', () => {
    mockPathname = '/agents/other-agent';
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: 'siemens-agent',
      isRestricted: false,
      isReady: true,
    });

    render(
      <AgentRouteGuard>
        <Child />
      </AgentRouteGuard>
    );

    expect(screen.getByText('child-content')).toBeInTheDocument();
  });

  it('is a no-op on non-agent routes', () => {
    mockPathname = '/manage/agents';
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: 'siemens-agent',
      isRestricted: true,
      isReady: true,
    });

    render(
      <AgentRouteGuard>
        <Child />
      </AgentRouteGuard>
    );

    expect(screen.getByText('child-content')).toBeInTheDocument();
  });
});
