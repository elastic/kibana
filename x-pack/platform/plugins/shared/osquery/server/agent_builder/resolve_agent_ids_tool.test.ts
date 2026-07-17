/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isToolHandlerStandardReturn, type ToolHandlerReturn } from '@kbn/agent-builder-server';
import type { ToolResult } from '@kbn/agent-builder-common';
import { resolveAgentIdsTool } from './resolve_agent_ids_tool';

interface MockAgent {
  id: string;
  status: string;
  enrolled_at: string;
  local_metadata?: { host?: { hostname?: string; name?: string } };
}

const buildAgent = (overrides: Partial<MockAgent>): MockAgent => ({
  id: 'agent-id',
  status: 'online',
  enrolled_at: '2026-07-17T00:00:00.000Z',
  local_metadata: { host: { hostname: 'SRV-DC01' } },
  ...overrides,
});

const buildContext = (agents: MockAgent[]) => {
  const listAgents = jest.fn().mockResolvedValue({ agents });
  const asInternalScopedUser = jest.fn().mockReturnValue({ listAgents });
  const getAgentService = jest.fn().mockReturnValue({ asInternalScopedUser });
  const getActiveSpace = jest.fn().mockResolvedValue({ id: 'default' });

  return {
    context: {
      experimentalFeatures: { agentBuilderTools: true },
      service: { getAgentService, getActiveSpace },
    } as any,
    listAgents,
  };
};

interface ResolvedResult {
  resolved: Array<{ hostname: string; agent_id: string | null; status: string | null }>;
  guidance?: string;
}

/** Extract `data` from the first result in a standard tool handler return. */
const getResultData = (result: ToolHandlerReturn<ToolResult>): ResolvedResult => {
  if (!isToolHandlerStandardReturn(result)) {
    throw new Error('Expected standard handler return');
  }
  return result.results[0].data as unknown as ResolvedResult;
};

describe('resolveAgentIdsTool', () => {
  it('prefers the online agent over stale offline/uninstalled enrollments for the same hostname', async () => {
    // Simulates a host that was re-enrolled multiple times (e.g. an agent
    // version upgrade): Fleet retains every prior enrollment record, all
    // matching the same local_metadata.host.hostname.
    const { context } = buildContext([
      buildAgent({ id: 'old-9.4.3', status: 'uninstalled', enrolled_at: '2026-07-17T10:26:33.000Z' }),
      buildAgent({ id: 'broken-snapshot', status: 'offline', enrolled_at: '2026-07-17T13:07:14.000Z' }),
      buildAgent({ id: 'current-ga', status: 'online', enrolled_at: '2026-07-17T13:42:02.000Z' }),
    ]);

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    const result = await tool.handler(
      { hostnames: ['SRV-DC01'] },
      { request: {}, spaceId: 'default' } as any
    );

    const data = getResultData(result);
    expect(data.resolved).toEqual([{ hostname: 'SRV-DC01', agent_id: 'current-ga', status: 'online' }]);
    expect(data.guidance).toBeUndefined();
  });

  it('falls back to the most recently enrolled agent when none are online', async () => {
    const { context } = buildContext([
      buildAgent({ id: 'older', status: 'offline', enrolled_at: '2026-07-17T10:00:00.000Z' }),
      buildAgent({ id: 'newer', status: 'offline', enrolled_at: '2026-07-17T13:00:00.000Z' }),
    ]);

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    const result = await tool.handler(
      { hostnames: ['SRV-DC01'] },
      { request: {}, spaceId: 'default' } as any
    );

    const data = getResultData(result);
    expect(data.resolved[0].agent_id).toBe('newer');
  });

  it('returns null agent_id with guidance when no enrolled agent matches the hostname', async () => {
    const { context } = buildContext([]);

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    const result = await tool.handler(
      { hostnames: ['UNKNOWN-HOST'] },
      { request: {}, spaceId: 'default' } as any
    );

    const data = getResultData(result);
    expect(data.resolved).toEqual([{ hostname: 'UNKNOWN-HOST', agent_id: null, status: null }]);
    expect(data.guidance).toContain('UNKNOWN-HOST');
  });
});
