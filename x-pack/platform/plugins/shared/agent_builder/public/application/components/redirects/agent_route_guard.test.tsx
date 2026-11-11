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
// Render Redirect as a marker so we can assert redirects without a full router.
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname }),
  Redirect: ({ to }: { to: string }) => <div>{`navigate:${to}`}</div>,
}));

// Render the loading spinner as a marker so we can assert the isReady gate.
jest.mock('./redirect_loading', () => ({
  RedirectLoading: () => <div>loading-spinner</div>,
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

  it('renders a spinner (not the agent page) on an agent route while not ready', () => {
    mockPathname = '/agents/other-agent/conversations/xyz';
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: null,
      isRestricted: false,
      isReady: false,
    });

    render(
      <AgentRouteGuard>
        <Child />
      </AgentRouteGuard>
    );

    expect(screen.getByText('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText('child-content')).not.toBeInTheDocument();
    expect(screen.queryByText(/^navigate:/)).not.toBeInTheDocument();
  });

  it('does not gate non-agent routes while not ready', () => {
    mockPathname = '/manage/agents';
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: null,
      isRestricted: false,
      isReady: false,
    });

    render(
      <AgentRouteGuard>
        <Child />
      </AgentRouteGuard>
    );

    expect(screen.getByText('child-content')).toBeInTheDocument();
    expect(screen.queryByText('loading-spinner')).not.toBeInTheDocument();
  });
});
