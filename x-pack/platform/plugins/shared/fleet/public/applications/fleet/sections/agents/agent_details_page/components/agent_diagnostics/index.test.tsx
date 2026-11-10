/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../mock';
import { sendGetAgentUploads, useAuthz } from '../../../../../hooks';
import type { Agent, AgentPolicy } from '../../../../../types';

import { AgentDiagnosticsTab } from '.';

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useAuthz: jest.fn(),
  sendGetAgentUploads: jest.fn(),
}));

const agent = {
  id: 'agent-1',
  active: true,
  local_metadata: { elastic: { agent: { version: '9.2.0' } } },
} as unknown as Agent;

const renderTab = (agentPolicy?: Partial<AgentPolicy>) =>
  createFleetTestRendererMock().render(
    <AgentDiagnosticsTab agent={agent} agentPolicy={agentPolicy as AgentPolicy} />
  );

describe('AgentDiagnosticsTab', () => {
  beforeEach(() => {
    jest.mocked(useAuthz).mockReturnValue({ fleet: { readAgents: true } } as any);
    jest.mocked(sendGetAgentUploads).mockResolvedValue({ data: { items: [] } } as any);
  });

  it('enables the request diagnostics button for a regular agent', async () => {
    const { getByText } = renderTab({ supports_agentless: false });

    await waitFor(() => expect(sendGetAgentUploads).toHaveBeenCalled());
    expect(getByText('Request diagnostics .zip').closest('button')).toBeEnabled();
  });

  it('disables the request diagnostics button for an agentless agent', async () => {
    const { getByText } = renderTab({ supports_agentless: true });

    await waitFor(() => expect(sendGetAgentUploads).toHaveBeenCalled());
    expect(getByText('Request diagnostics .zip').closest('button')).toBeDisabled();
  });
});
