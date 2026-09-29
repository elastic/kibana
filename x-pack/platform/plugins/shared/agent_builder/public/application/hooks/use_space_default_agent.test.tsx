/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { queryKeys } from '../query_keys';
import { ActiveSpaceProvider } from '../context/active_space_context';
import {
  useEffectiveSpaceDefaultAgent,
  useSetSpaceDefaultAgent,
  useSpaceDefaultAgent,
} from './use_space_default_agent';

// The hooks read the space settings service off the shared services context;
// mock the accessor so we can wire in per-test service stubs.
vi.mock('./use_agent_builder_service');
// `useEffectiveSpaceDefaultAgent` cross-checks against the agents list and the
// user's privileges; mock those sibling hooks (the other describes here don't
// use them, so this is inert for them).
vi.mock('./agents/use_agents');
vi.mock('./use_ui_privileges');

const { useAgentBuilderServices } = await vi.importMock('./use_agent_builder_service');
const { useAgentBuilderAgents } = await vi.importMock('./agents/use_agents');
const { useUiPrivileges } = await vi.importMock('./use_ui_privileges');

const buildServices = (overrides?: { get?: Mock; set?: Mock }) => {
  const get = overrides?.get ?? vi.fn().mockResolvedValue({ default_agent_id: null });
  const set = overrides?.set ?? vi.fn().mockResolvedValue({ default_agent_id: null });
  useAgentBuilderServices.mockReturnValue({
    spaceSettingsService: { get, set },
  });
  return { get, set };
};

const withProviders = (queryClient: QueryClient, spaceId = 'default') => {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <ActiveSpaceProvider spaceId={spaceId}>{children}</ActiveSpaceProvider>
    </QueryClientProvider>
  );
  return wrapper;
};

describe('useSpaceDefaultAgent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Disable retries so a failed queryFn surfaces immediately instead of
    // hanging tests through react-query's default retry policy.
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('returns the space assigned agent id from the service', async () => {
    const { get } = buildServices({
      get: vi.fn().mockResolvedValue({ default_agent_id: 'siemens-agent' }),
    });

    const { result } = renderHook(() => useSpaceDefaultAgent(), {
      wrapper: withProviders(queryClient),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(get).toHaveBeenCalledTimes(1);
    expect(result.current.defaultAgentId).toBe('siemens-agent');
    expect(result.current.error).toBeFalsy();
  });

  it('returns null when the service reports no assignment', async () => {
    buildServices({ get: vi.fn().mockResolvedValue({ default_agent_id: null }) });

    const { result } = renderHook(() => useSpaceDefaultAgent(), {
      wrapper: withProviders(queryClient),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(result.current.defaultAgentId).toBe(null);
  });
});

describe('useSetSpaceDefaultAgent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('calls the service with the requested agent id and invalidates dependent queries', async () => {
    // Pre-seed the caches the hook should invalidate so we can verify the
    // invalidation call rather than the (empty) resulting state.
    const spaceSettingsKey = queryKeys.spaceSettings.all;
    const agentProfilesKey = queryKeys.agentProfiles.all;
    queryClient.setQueryData(spaceSettingsKey, { default_agent_id: null });
    queryClient.setQueryData(agentProfilesKey, ['stub']);
    vi.spyOn(queryClient, 'invalidateQueries');

    const { set } = buildServices({
      set: vi.fn().mockResolvedValue({ default_agent_id: 'siemens-agent' }),
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSetSpaceDefaultAgent({ onSuccess }), {
      wrapper: withProviders(queryClient, 'default'),
    });

    await act(async () => {
      await result.current.mutateAsync('siemens-agent');
    });

    expect(set).toHaveBeenCalledWith('siemens-agent');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: spaceSettingsKey });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: agentProfilesKey });
    expect(onSuccess).toHaveBeenCalledWith('siemens-agent');
  });

  it('surfaces service errors through the onError callback', async () => {
    const failure = new Error('nope');
    buildServices({ set: vi.fn().mockRejectedValue(failure) });

    const onError = vi.fn();
    const { result } = renderHook(() => useSetSpaceDefaultAgent({ onError }), {
      wrapper: withProviders(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(null)).rejects.toThrow('nope');
    });

    // react-query passes extra args (variables, context) to onError, so use
    // a subset match rather than a strict argument list.
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBe(failure);
  });
});

describe('useEffectiveSpaceDefaultAgent', () => {
  let queryClient: QueryClient;

  const setupAgents = (agents: Array<{ id: string }>, isFetched = true) => {
    useAgentBuilderAgents.mockReturnValue({ agents, isFetched });
  };
  const setupPrivileges = (manageAgents: boolean) => {
    useUiPrivileges.mockReturnValue({ manageAgents });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Safe defaults; individual tests override.
    setupAgents([]);
    setupPrivileges(false);
  });

  it('resolves and restricts a non-admin when the assigned agent is visible', async () => {
    buildServices({ get: vi.fn().mockResolvedValue({ default_agent_id: 'siemens-agent' }) });
    setupAgents([{ id: 'siemens-agent' }, { id: 'other-agent' }]);
    setupPrivileges(false);

    const { result } = renderHook(() => useEffectiveSpaceDefaultAgent(), {
      wrapper: withProviders(queryClient),
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.effectiveDefaultAgentId).toBe('siemens-agent');
    expect(result.current.isRestricted).toBe(true);
  });

  it('resolves but does not restrict an admin', async () => {
    buildServices({ get: vi.fn().mockResolvedValue({ default_agent_id: 'siemens-agent' }) });
    setupAgents([{ id: 'siemens-agent' }]);
    setupPrivileges(true);

    const { result } = renderHook(() => useEffectiveSpaceDefaultAgent(), {
      wrapper: withProviders(queryClient),
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.effectiveDefaultAgentId).toBe('siemens-agent');
    expect(result.current.isRestricted).toBe(false);
  });

  it('treats the space as unconfigured when the assigned agent is not in the visible list', async () => {
    // Simulates a deleted / now-private / inaccessible assignment.
    buildServices({ get: vi.fn().mockResolvedValue({ default_agent_id: 'gone-agent' }) });
    setupAgents([{ id: 'other-agent' }]);
    setupPrivileges(false);

    const { result } = renderHook(() => useEffectiveSpaceDefaultAgent(), {
      wrapper: withProviders(queryClient),
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.effectiveDefaultAgentId).toBe(null);
    expect(result.current.isRestricted).toBe(false);
  });

  it('is not ready while the agents list is still loading', async () => {
    buildServices({ get: vi.fn().mockResolvedValue({ default_agent_id: 'siemens-agent' }) });
    setupAgents([], false);
    setupPrivileges(false);

    const { result } = renderHook(() => useEffectiveSpaceDefaultAgent(), {
      wrapper: withProviders(queryClient),
    });

    // Even once the settings query settles, isReady stays false until the
    // agents list is fetched, so the effective default is withheld.
    await waitFor(() => expect(useAgentBuilderAgents).toHaveBeenCalled());
    expect(result.current.isReady).toBe(false);
    expect(result.current.effectiveDefaultAgentId).toBe(null);
  });
});
