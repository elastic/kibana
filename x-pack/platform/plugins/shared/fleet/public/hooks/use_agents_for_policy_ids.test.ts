/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';

import { sendGetAgentsForRq } from './use_request';
import {
  fetchAgentsByKuery,
  MAX_AGENTS_PAGES,
  useAgentsForPolicyIds,
} from './use_agents_for_policy_ids';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('./use_request', () => ({ sendGetAgentsForRq: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;
const mockSendGetAgents = sendGetAgentsForRq as jest.Mock;

const PAGE_SIZE = 1000;
const makeAgents = (count: number, prefix = 'a') =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i}` }));

/** Answers each page request from a fixed list of agents, as Fleet would. */
const serveAgents = (all: Array<{ id: string }>) =>
  mockSendGetAgents.mockImplementation(async ({ page, perPage }) => ({
    items: all.slice((page - 1) * perPage, page * perPage),
    total: all.length,
    page,
    perPage,
  }));

describe('fetchAgentsByKuery', () => {
  beforeEach(() => jest.clearAllMocks());

  it('makes one request when everything fits in a page', async () => {
    serveAgents(makeAgents(3));

    const result = await fetchAgentsByKuery('kuery');

    expect(mockSendGetAgents).toHaveBeenCalledTimes(1);
    expect(mockSendGetAgents).toHaveBeenCalledWith({ kuery: 'kuery', perPage: PAGE_SIZE, page: 1 });
    expect(result).toEqual({ agents: makeAgents(3), total: 3, isTruncated: false });
  });

  it('returns nothing, in one request, when there are no agents', async () => {
    serveAgents([]);

    expect(await fetchAgentsByKuery('kuery')).toEqual({
      agents: [],
      total: 0,
      isTruncated: false,
    });
    expect(mockSendGetAgents).toHaveBeenCalledTimes(1);
  });

  it('treats a page that is exactly full as the whole list', async () => {
    serveAgents(makeAgents(PAGE_SIZE));

    const result = await fetchAgentsByKuery('kuery');

    expect(mockSendGetAgents).toHaveBeenCalledTimes(1);
    expect(result.agents).toHaveLength(PAGE_SIZE);
    expect(result.isTruncated).toBe(false);
  });

  it('fetches every page when there are more agents than one page holds', async () => {
    const all = makeAgents(2500);
    serveAgents(all);

    const result = await fetchAgentsByKuery('kuery');

    expect(mockSendGetAgents.mock.calls.map(([{ page }]) => page).sort()).toEqual([1, 2, 3]);
    expect(result.agents).toEqual(all);
    expect(result).toMatchObject({ total: 2500, isTruncated: false });
  });

  it('keeps agents from later pages, so an unhealthy one past the first page is not lost', async () => {
    serveAgents([...makeAgents(PAGE_SIZE), { id: 'unhealthy-on-page-2' }]);

    const { agents } = await fetchAgentsByKuery('kuery');

    expect(agents.map(({ id }) => id)).toContain('unhealthy-on-page-2');
  });

  it('stops at the page cap and says the list is truncated', async () => {
    const all = makeAgents(PAGE_SIZE * (MAX_AGENTS_PAGES + 5));
    serveAgents(all);

    const result = await fetchAgentsByKuery('kuery');

    expect(mockSendGetAgents).toHaveBeenCalledTimes(MAX_AGENTS_PAGES);
    expect(result.agents).toHaveLength(PAGE_SIZE * MAX_AGENTS_PAGES);
    expect(result).toMatchObject({ total: all.length, isTruncated: true });
  });

  it('asks for the same kuery on every page', async () => {
    serveAgents(makeAgents(1500));

    await fetchAgentsByKuery('policy-kuery');

    for (const [request] of mockSendGetAgents.mock.calls) {
      expect(request.kuery).toBe('policy-kuery');
    }
  });

  it('fails when the first page fails', async () => {
    mockSendGetAgents.mockRejectedValue(new Error('boom'));

    await expect(fetchAgentsByKuery('kuery')).rejects.toThrow('boom');
  });

  it('fails when a later page fails, instead of returning a partial list as complete', async () => {
    mockSendGetAgents.mockImplementation(async ({ page }) => {
      if (page === 2) throw new Error('page 2 failed');
      return { items: makeAgents(PAGE_SIZE), total: 2500, page, perPage: PAGE_SIZE };
    });

    await expect(fetchAgentsByKuery('kuery')).rejects.toThrow('page 2 failed');
  });
});

describe('useAgentsForPolicyIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: undefined, dataUpdatedAt: 0, isInitialLoading: false });
  });

  const options = (call = 0) => mockUseQuery.mock.calls[call][2];

  it('does not query without policies', () => {
    renderHook(() => useAgentsForPolicyIds([]));

    expect(options().enabled).toBe(false);
  });

  it('does not query when disabled', () => {
    renderHook(() => useAgentsForPolicyIds(['p1'], { enabled: false }));

    expect(options().enabled).toBe(false);
  });

  it('queries for the agents of the given policies, version-specific variants included', () => {
    renderHook(() => useAgentsForPolicyIds(['p1', 'p2']));

    const [queryKey] = mockUseQuery.mock.calls[0];
    expect(options().enabled).toBe(true);
    expect(queryKey[0]).toBe('agents_for_policy_ids');
    expect(queryKey[1]).toContain('p1');
    expect(queryKey[1]).toContain('p2');
    expect(queryKey[1]).toContain('fleet-agents.policy_base_id');
    expect(queryKey[1]).toContain('fleet-agents.policy_id');
  });

  it('refetches at the given interval, and not by default', () => {
    renderHook(() => useAgentsForPolicyIds(['p1'], { refetchInterval: 10_000 }));
    expect(options(0).refetchInterval).toBe(10_000);

    renderHook(() => useAgentsForPolicyIds(['p1']));
    expect(options(1).refetchInterval).toBe(false);
  });

  it('does not retry a failed fetch when polling, since the next poll is the retry', () => {
    renderHook(() => useAgentsForPolicyIds(['p1'], { refetchInterval: 10_000 }));
    expect(options(0).retry).toBe(false);

    renderHook(() => useAgentsForPolicyIds(['p1']));
    expect(options(1)).not.toHaveProperty('retry');
  });

  it('returns no agents until the first response arrives', () => {
    const { result } = renderHook(() => useAgentsForPolicyIds(['p1']));

    expect(result.current).toEqual({
      agents: [],
      total: 0,
      isTruncated: false,
      dataUpdatedAt: 0,
      isLoading: false,
      error: undefined,
    });
  });

  it('returns the agents, when they were fetched, and whether the list is truncated', () => {
    const data = { agents: makeAgents(2), total: 5000, isTruncated: true };
    mockUseQuery.mockReturnValue({ data, dataUpdatedAt: 1234, isInitialLoading: false });

    const { result } = renderHook(() => useAgentsForPolicyIds(['p1']));

    expect(result.current).toMatchObject({
      agents: data.agents,
      total: 5000,
      isTruncated: true,
      dataUpdatedAt: 1234,
    });
  });

  it('reports loading only while the first fetch is running', () => {
    mockUseQuery.mockReturnValue({ data: undefined, dataUpdatedAt: 0, isInitialLoading: true });

    const { result } = renderHook(() => useAgentsForPolicyIds(['p1']));

    expect(result.current.isLoading).toBe(true);
  });

  it('passes on the error of a failed fetch', () => {
    const error = new Error('boom');
    mockUseQuery.mockReturnValue({ data: undefined, dataUpdatedAt: 0, error });

    const { result } = renderHook(() => useAgentsForPolicyIds(['p1']));

    expect(result.current.error).toBe(error);
  });

  it('runs the paged fetch with the kuery it built', async () => {
    serveAgents(makeAgents(2));
    renderHook(() => useAgentsForPolicyIds(['p1']));

    await mockUseQuery.mock.calls[0][1]();

    expect(mockSendGetAgents.mock.calls[0][0].kuery).toContain('p1');
  });
});
