/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom-v5-compat';

// Stub the hook so we can independently control the readiness signal and the
// resolved agent id.
const mockUseLastAgentId = jest.fn();
jest.mock('../../hooks/use_last_agent_id', () => ({
  useLastAgentId: () => mockUseLastAgentId(),
}));

import { RootRedirect } from './root_redirect';

describe('RootRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a spinner while the space settings query is still loading', () => {
    // While `isReady` is false the redirect must not fire — otherwise a
    // restricted user in a space with an assigned default would briefly
    // navigate to `elastic-ai-agent` and hit the "Agent has been deleted"
    // error before we know the correct agent id.
    mockUseLastAgentId.mockReturnValue({ agentId: 'elastic-ai-agent', isReady: false });

    render(
      <MemoryRouter>
        <RootRedirect />
      </MemoryRouter>
    );

    expect(screen.getByTestId('agentBuilderRootRedirectLoading')).toBeInTheDocument();
  });

  it('navigates once the space settings query has resolved', () => {
    mockUseLastAgentId.mockReturnValue({ agentId: 'siemens-agent', isReady: true });

    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <RootRedirect />
      </MemoryRouter>
    );

    // React Router's <Navigate> replaces without rendering DOM output, so we
    // just assert the loading gate has been dismissed.
    expect(
      container.querySelector('[data-test-subj="agentBuilderRootRedirectLoading"]')
    ).toBeNull();
  });
});
