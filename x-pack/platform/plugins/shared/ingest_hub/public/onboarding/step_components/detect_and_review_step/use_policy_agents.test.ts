/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@kbn/fleet-plugin/public', () => ({ sendGetAgents: jest.fn() }));

import { useQuery } from '@kbn/react-query';
import { sendGetAgents } from '@kbn/fleet-plugin/public';
import { fetchPolicyAgents, MAX_AGENT_PAGES, usePolicyAgents } from './use_policy_agents';

const mockUseQuery = useQuery as jest.Mock;
const mockSendGetAgents = sendGetAgents as jest.Mock;

const PAGE_SIZE = 1000;
const makeAgents = (count: number, prefix = 'a') =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i}` }));

/** Answers each page request from a fixed list of agents, as Fleet would. */
const serveAgents = (all: Array<{ id: string }>) =>
  mockSendGetAgents.mockImplementation(async ({ page, perPage }) => ({
    data: {
      items: all.slice((page - 1) * perPage, page * perPage),
      total: all.length,
      page,
      perPage,
    },
  }));

describe('fetchPolicyAgents', () => {
  beforeEach(() => jest.clearAllMocks());

  it('makes one request when everything fits in a page', async () => {
    serveAgents(makeAgents(3));

    const result = await fetchPolicyAgents('kuery');

    expect(mockSendGetAgents).toHaveBeenCalledTimes(1);
    expect(mockSendGetAgents).toHaveBeenCalledWith({ kuery: 'kuery', perPage: PAGE_SIZE, page: 1 });
    expect(result).toEqual({ agents: makeAgents(3), total: 3, isTruncated: false });
  });

  it('returns nothing, in one request, when there are no agents', async () => {
    serveAgents([]);

    expect(await fetchPolicyAgents('kuery')).toEqual({ agents: [], total: 0, isTruncated: false });
    expect(mockSendGetAgents).toHaveBeenCalledTimes(1);
  });

  it('treats a page that is exactly full as the whole list', async () => {
    serveAgents(makeAgents(PAGE_SIZE));

    const result = await fetchPolicyAgents('kuery');

    expect(mockSendGetAgents).toHaveBeenCalledTimes(1);
    expect(result.agents).toHaveLength(PAGE_SIZE);
    expect(result.isTruncated).toBe(false);
  });

  it('fetches every page when there are more agents than one page holds', async () => {
    const all = makeAgents(2500);
    serveAgents(all);

    const result = await fetchPolicyAgents('kuery');

    expect(mockSendGetAgents.mock.calls.map(([{ page }]) => page).sort()).toEqual([1, 2, 3]);
    expect(result.agents).toEqual(all);
    expect(result).toMatchObject({ total: 2500, isTruncated: false });
  });

  it('keeps agents from later pages, so an unhealthy one past the first page is not lost', async () => {
    const all = [...makeAgents(PAGE_SIZE), { id: 'unhealthy-on-page-2' }];
    serveAgents(all);

    const { agents } = await fetchPolicyAgents('kuery');

    expect(agents.map(({ id }) => id)).toContain('unhealthy-on-page-2');
  });

  it('stops at the page cap and says the list is truncated', async () => {
    const all = makeAgents(PAGE_SIZE * (MAX_AGENT_PAGES + 5));
    serveAgents(all);

    const result = await fetchPolicyAgents('kuery');

    expect(mockSendGetAgents).toHaveBeenCalledTimes(MAX_AGENT_PAGES);
    expect(result.agents).toHaveLength(PAGE_SIZE * MAX_AGENT_PAGES);
    expect(result).toMatchObject({ total: all.length, isTruncated: true });
  });

  it('asks for the same kuery on every page', async () => {
    serveAgents(makeAgents(1500));

    await fetchPolicyAgents('policy-kuery');

    for (const [request] of mockSendGetAgents.mock.calls) {
      expect(request.kuery).toBe('policy-kuery');
    }
  });

  it('fails when the first page fails', async () => {
    mockSendGetAgents.mockResolvedValue({ error: new Error('boom') });

    await expect(fetchPolicyAgents('kuery')).rejects.toThrow('boom');
  });

  it('fails when a later page fails, instead of returning a partial list as complete', async () => {
    mockSendGetAgents.mockImplementation(async ({ page }) =>
      page === 2
        ? { error: new Error('page 2 failed') }
        : { data: { items: makeAgents(PAGE_SIZE), total: 2500, page, perPage: PAGE_SIZE } }
    );

    await expect(fetchPolicyAgents('kuery')).rejects.toThrow('page 2 failed');
  });

  it('fails when the response has no data and no error', async () => {
    mockSendGetAgents.mockResolvedValue({});

    await expect(fetchPolicyAgents('kuery')).rejects.toThrow();
  });
});

describe('usePolicyAgents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: undefined, dataUpdatedAt: 0 });
  });

  it('does not query without policies', () => {
    renderHook(() => usePolicyAgents({ policyIds: [], shouldPoll: true }));

    expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
  });

  it('queries for the agents of the given policies, version-specific variants included', () => {
    renderHook(() => usePolicyAgents({ policyIds: ['p1', 'p2'], shouldPoll: true }));

    const options = mockUseQuery.mock.calls[0][0];
    expect(options.enabled).toBe(true);
    expect(options.queryKey).toEqual([
      'ingest_hub',
      'policy_agents',
      expect.stringContaining('p1'),
    ]);
    expect(options.queryKey[2]).toContain('p2');
    expect(options.queryKey[2]).toContain('fleet-agents.policy_base_id');
  });

  it('polls every 10 s while asked to, and stops when not', () => {
    renderHook(() => usePolicyAgents({ policyIds: ['p1'], shouldPoll: true }));
    expect(mockUseQuery.mock.calls[0][0].refetchInterval).toBe(10_000);

    renderHook(() => usePolicyAgents({ policyIds: ['p1'], shouldPoll: false }));
    expect(mockUseQuery.mock.calls[1][0].refetchInterval).toBe(false);
  });

  it('returns no agents until the first response arrives', () => {
    const { result } = renderHook(() => usePolicyAgents({ policyIds: ['p1'], shouldPoll: true }));

    expect(result.current).toEqual({ agents: [], dataUpdatedAt: 0, isTruncated: false });
  });

  it('returns the agents, when they were fetched, and whether the list is truncated', () => {
    const data = { agents: makeAgents(2), total: 5000, isTruncated: true };
    mockUseQuery.mockReturnValue({ data, dataUpdatedAt: 1234 });

    const { result } = renderHook(() => usePolicyAgents({ policyIds: ['p1'], shouldPoll: true }));

    expect(result.current).toEqual({
      agents: data.agents,
      dataUpdatedAt: 1234,
      isTruncated: true,
    });
  });

  it('runs the paged fetch with the kuery it built', async () => {
    serveAgents(makeAgents(2));
    renderHook(() => usePolicyAgents({ policyIds: ['p1'], shouldPoll: true }));

    await mockUseQuery.mock.calls[0][0].queryFn();

    expect(mockSendGetAgents.mock.calls[0][0].kuery).toContain('p1');
  });
});
