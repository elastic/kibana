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

  it('matches the hostname case-insensitively and builds a case-insensitive kuery', async () => {
    const { context, listAgents } = buildContext([
      buildAgent({
        id: 'mixed-case',
        local_metadata: { host: { hostname: 'srv-dc01.corp.local', name: 'Srv-Dc01' } },
      }),
    ]);

    const mixedCase = buildAgent({
      id: 'mixed-case',
      local_metadata: { host: { hostname: 'srv-dc01.corp.local', name: 'Srv-Dc01' } },
    });
    // Keyword equality is case-sensitive, so the exact query finds nothing and
    // the case-insensitive substring fallback has to resolve the host.
    listAgents.mockImplementation(async ({ kuery }) => ({
      agents: kuery.includes('.keyword:*') ? [mixedCase] : [],
    }));

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    const result = await tool.handler({ hostnames: ['SRV-DC01'] }, {
      request: {},
      spaceId: 'default',
    } as any);

    expect(getResultData(result).resolved[0].agent_id).toBe('mixed-case');
    const { kuery } = listAgents.mock.calls[1][0];
    expect(kuery).toContain('local_metadata.host.hostname.keyword:*SRV-DC01*');
    expect(kuery).toContain('local_metadata.host.name.keyword:*srv-dc01*');
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

  it('uses a hostname-only kuery that does not match agent id, policy or platform', async () => {
    const { context, listAgents } = buildContext([buildAgent({ id: 'a1' })]);

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    await tool.handler({ hostnames: ['linux'] }, { request: {}, spaceId: 'default' } as any);

    const { kuery } = listAgents.mock.calls[0][0];
    expect(kuery).toContain('local_metadata.host.hostname');
    expect(kuery).not.toContain('local_metadata.elastic.agent.id');
    expect(kuery).not.toContain('local_metadata.os.platform');
    expect(kuery).not.toContain('policy_name');
  });

  it('stops paging after a bounded number of pages per hostname', async () => {
    const fullPage = Array.from({ length: 50 }, (_, index) =>
      buildAgent({ id: `stale-${index}`, status: 'offline' })
    );
    const { context, listAgents } = buildContext(Array.from({ length: 40 }, () => fullPage));

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    await tool.handler({ hostnames: ['SRV-DC01'] }, { request: {}, spaceId: 'default' } as any);

    // Exact pass + substring fallback, each capped at 10 pages.
    expect(listAgents.mock.calls.length).toBeLessThanOrEqual(20);
    expect(listAgents.mock.calls.length).toBeGreaterThan(1);
  });

  it('prefers a current online agent over a stale exact-casing enrollment', async () => {
    const { context, listAgents } = buildContext([]);
    const stale = buildAgent({
      id: 'stale',
      status: 'offline',
      local_metadata: { host: { hostname: 'SRV-DC01' } },
    });
    const current = buildAgent({
      id: 'current',
      status: 'online',
      local_metadata: { host: { hostname: 'srv-dc01.corp.local', name: 'Srv-Dc01' } },
    });
    listAgents.mockImplementation(async ({ kuery }) => ({
      agents: kuery.includes('.keyword:*') ? [stale, current] : [stale],
    }));

    const tool = resolveAgentIdsTool(context, loggerMock.create());
    const result = await tool.handler({ hostnames: ['SRV-DC01'] }, {
      request: {},
      spaceId: 'default',
    } as any);

    expect(getResultData(result).resolved[0]).toMatchObject({
      agent_id: 'current',
      status: 'online',
    });
  });

  describe('hostnames that are a prefix of many other hosts', () => {
    const noisyPage = Array.from({ length: 50 }, (_, index) =>
      buildAgent({
        id: `noisy-${index}`,
        local_metadata: { host: { hostname: 'SRV-10000' } },
      })
    );

    it('finds the exact host even when newer substring matches fill the page cap', async () => {
      const { context, listAgents } = buildContext([]);
      listAgents.mockImplementation(async ({ kuery, page = 1 }) => {
        if (kuery.includes('hostname.keyword:"SRV-1"')) {
          return {
            agents:
              page === 1
                ? [
                    buildAgent({
                      id: 'srv-1-agent',
                      local_metadata: { host: { hostname: 'SRV-1' } },
                    }),
                  ]
                : [],
          };
        }

        return { agents: noisyPage };
      });

      const tool = resolveAgentIdsTool(context, loggerMock.create());
      const result = await tool.handler({ hostnames: ['SRV-1'] }, {
        request: {},
        spaceId: 'default',
      } as any);

      expect(getResultData(result).resolved[0]).toMatchObject({
        hostname: 'SRV-1',
        agent_id: 'srv-1-agent',
        osquery_capable: true,
      });
    });

    it('reports an inconclusive result instead of a missing agent when candidates were truncated', async () => {
      const { context, listAgents } = buildContext([]);
      listAgents.mockImplementation(async ({ kuery }) => ({
        agents: kuery.includes('.keyword:"SRV-1"') ? [] : noisyPage,
      }));

      const tool = resolveAgentIdsTool(context, loggerMock.create());
      const result = await tool.handler({ hostnames: ['SRV-1'] }, {
        request: {},
        spaceId: 'default',
      } as any);

      const data = getResultData(result);
      expect(data.resolved[0]).toMatchObject({
        agent_id: null,
        osquery_capable: false,
        inconclusive: true,
      });
      expect(data.guidance).toContain('Could not determine an agent for: SRV-1');
      expect(data.guidance).not.toContain('No enrolled Osquery-capable agent found');
    });
  });
});
