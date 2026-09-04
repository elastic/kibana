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

const buildContext = (agentsOrPages: MockAgent[] | MockAgent[][]) => {
  const pages = Array.isArray(agentsOrPages[0])
    ? (agentsOrPages as MockAgent[][])
    : [agentsOrPages as MockAgent[]];
  const listAgents = jest.fn().mockImplementation(async ({ page = 1 }) => ({
    agents: pages[page - 1] ?? [],
  }));
  const asInternalScopedUser = jest.fn().mockReturnValue({ listAgents });
  const getAgentService = jest.fn().mockReturnValue({ asInternalScopedUser });
  const getActiveSpace = jest.fn().mockResolvedValue({ id: 'default' });

  const savedObjectsClient = { find: jest.fn().mockResolvedValue({ saved_objects: [] }) };

  // The tool asserts the same `osquery-read` privilege its route counterpart
  // declares, and only resolves agents enrolled in an Osquery-capable policy.
  const security = {
    authz: {
      mode: { useRbacForRequest: () => false },
      actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      checkPrivilegesDynamicallyWithRequest: jest.fn(),
    },
  };

  const getPackagePolicyService = jest.fn().mockReturnValue({
    getByIDs: jest.fn().mockResolvedValue([{ id: 'pkg-1', policy_ids: ['agent-policy-1'] }]),
    fetchAllItemIds: jest.fn().mockImplementation(async function* () {
      yield ['pkg-1'];
    }),
  });

  return {
    context: {
      experimentalFeatures: { agentBuilderTools: true },
      logFactory: { get: () => loggerMock.create() },
      getStartServices: jest
        .fn()
        .mockResolvedValue([
          { savedObjects: { getScopedClient: jest.fn().mockReturnValue(savedObjectsClient) } },
          { security },
        ]),
      service: { getAgentService, getActiveSpace, getPackagePolicyService },
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
      buildAgent({
        id: 'old-9.4.3',
        status: 'uninstalled',
        enrolled_at: '2026-07-17T10:26:33.000Z',
      }),
      buildAgent({
        id: 'broken-snapshot',
        status: 'offline',
        enrolled_at: '2026-07-17T13:07:14.000Z',
      }),
      buildAgent({ id: 'current-ga', status: 'online', enrolled_at: '2026-07-17T13:42:02.000Z' }),
    ]);

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    const result = await tool.handler({ hostnames: ['SRV-DC01'] }, {
      request: {},
      spaceId: 'default',
    } as any);

    const data = getResultData(result);
    expect(data.resolved).toEqual([
      { hostname: 'SRV-DC01', agent_id: 'current-ga', status: 'online', osquery_capable: true },
    ]);
    expect(data.guidance).toBeUndefined();
  });

  it('falls back to the most recently enrolled agent when none are online', async () => {
    const { context } = buildContext([
      buildAgent({ id: 'older', status: 'offline', enrolled_at: '2026-07-17T10:00:00.000Z' }),
      buildAgent({ id: 'newer', status: 'offline', enrolled_at: '2026-07-17T13:00:00.000Z' }),
    ]);

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    const result = await tool.handler({ hostnames: ['SRV-DC01'] }, {
      request: {},
      spaceId: 'default',
    } as any);

    const data = getResultData(result);
    expect(data.resolved[0].agent_id).toBe('newer');
  });

  it('returns null agent_id with guidance when no enrolled agent matches the hostname', async () => {
    const { context } = buildContext([]);

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    const result = await tool.handler({ hostnames: ['UNKNOWN-HOST'] }, {
      request: {},
      spaceId: 'default',
    } as any);

    const data = getResultData(result);
    expect(data.resolved).toEqual([
      { hostname: 'UNKNOWN-HOST', agent_id: null, status: null, osquery_capable: false },
    ]);
    expect(data.guidance).toContain('UNKNOWN-HOST');
  });

  it('continues past the first Fleet page to find an older online enrollment', async () => {
    const stalePage = Array.from({ length: 50 }, (_, index) =>
      buildAgent({
        id: `newer-stale-${index}`,
        status: 'offline',
        enrolled_at: `2026-07-18T00:${String(index).padStart(2, '0')}:00.000Z`,
      })
    );
    const { context, listAgents } = buildContext([
      stalePage,
      [
        buildAgent({
          id: 'older-online-osquery-agent',
          status: 'online',
          enrolled_at: '2026-07-17T13:42:02.000Z',
        }),
      ],
      [],
    ]);

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    const result = await tool.handler({ hostnames: ['SRV-DC01'] }, {
      request: {},
      spaceId: 'default',
    } as any);

    const data = getResultData(result);
    expect(data.resolved[0]).toMatchObject({
      hostname: 'SRV-DC01',
      agent_id: 'older-online-osquery-agent',
      status: 'online',
      osquery_capable: true,
    });
    expect(listAgents).toHaveBeenCalledWith(expect.objectContaining({ page: 1, perPage: 50 }));
    expect(listAgents).toHaveBeenCalledWith(expect.objectContaining({ page: 2, perPage: 50 }));
  });
});
