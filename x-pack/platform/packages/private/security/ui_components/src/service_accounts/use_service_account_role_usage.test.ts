/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import type { FindServiceAccountsByRolesResponse } from '@kbn/core-security-common';

import type { ServiceAccountRoleUsageLookup } from './use_service_account_role_usage';
import { useServiceAccountRoleUsage } from './use_service_account_role_usage';

const found: FindServiceAccountsByRolesResponse = {
  serviceAccounts: [
    { id: 'kibana/relay', name: 'relay', roles: ['viewer'], enabled: true, workloadCount: 1 },
  ],
  complete: true,
};

const httpError = (status: number) => Object.assign(new Error('failed'), { response: { status } });

const createLookup = (enabled = true): jest.Mocked<ServiceAccountRoleUsageLookup> => ({
  isEnabled: jest.fn().mockReturnValue(enabled),
  findByRoles: jest.fn().mockResolvedValue(found),
});

describe('useServiceAccountRoleUsage', () => {
  it('looks up the roles and reports what it found', async () => {
    const lookup = createLookup();

    const { result } = renderHook(() => useServiceAccountRoleUsage(lookup, ['viewer']));

    expect(result.current).toEqual({ status: 'loading' });
    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'loaded',
        serviceAccounts: found.serviceAccounts,
        complete: true,
      })
    );
    expect(lookup.findByRoles).toHaveBeenCalledWith(['viewer']);
  });

  it('stays hidden without looking anything up when service accounts are disabled', () => {
    const lookup = createLookup(false);

    const { result } = renderHook(() => useServiceAccountRoleUsage(lookup, ['viewer']));

    expect(result.current).toEqual({ status: 'hidden' });
    expect(lookup.findByRoles).not.toHaveBeenCalled();
  });

  it('stays hidden without looking anything up when there are no roles', () => {
    const lookup = createLookup();

    const { result } = renderHook(() => useServiceAccountRoleUsage(lookup, []));

    expect(result.current).toEqual({ status: 'hidden' });
    expect(lookup.findByRoles).not.toHaveBeenCalled();
  });

  it('does not look up again when re-rendered with an equal set of roles', async () => {
    const lookup = createLookup();

    const { result, rerender } = renderHook(
      ({ roles }) => useServiceAccountRoleUsage(lookup, roles),
      { initialProps: { roles: ['viewer', 'editor'] } }
    );
    await waitFor(() => expect(result.current.status).toBe('loaded'));

    rerender({ roles: ['editor', 'viewer', 'viewer'] });

    expect(result.current.status).toBe('loaded');
    expect(lookup.findByRoles).toHaveBeenCalledTimes(1);
    expect(lookup.findByRoles).toHaveBeenCalledWith(['editor', 'viewer']);
  });

  it('drops a response that arrives after the roles changed again', async () => {
    const lookup = createLookup();
    let resolveFirst: (value: FindServiceAccountsByRolesResponse) => void = () => {};
    lookup.findByRoles
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ serviceAccounts: [], complete: true });

    const { result, rerender } = renderHook(
      ({ roles }) => useServiceAccountRoleUsage(lookup, roles),
      { initialProps: { roles: ['viewer'] } }
    );
    await waitFor(() => expect(lookup.findByRoles).toHaveBeenCalledTimes(1));

    rerender({ roles: ['editor'] });
    await waitFor(() =>
      expect(result.current).toEqual({ status: 'loaded', serviceAccounts: [], complete: true })
    );

    await act(async () => resolveFirst(found));

    expect(result.current).toEqual({ status: 'loaded', serviceAccounts: [], complete: true });
  });

  it('waits for the roles to settle when debounced', async () => {
    jest.useFakeTimers();
    try {
      const lookup = createLookup();

      const { rerender } = renderHook(
        ({ roles }) => useServiceAccountRoleUsage(lookup, roles, { debounceMs: 300 }),
        { initialProps: { roles: ['viewer'] } }
      );
      act(() => jest.advanceTimersByTime(100));
      rerender({ roles: ['viewer', 'editor'] });
      await act(async () => jest.advanceTimersByTime(300));

      expect(lookup.findByRoles).toHaveBeenCalledTimes(1);
      expect(lookup.findByRoles).toHaveBeenCalledWith(['editor', 'viewer']);
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([403, 404])('stays hidden when the lookup answers %s', async (status) => {
    const lookup = createLookup();
    lookup.findByRoles.mockRejectedValue(httpError(status));

    const { result } = renderHook(() => useServiceAccountRoleUsage(lookup, ['viewer']));

    await waitFor(() => expect(result.current).toEqual({ status: 'hidden' }));
  });

  it('reports an error for any other failure', async () => {
    const lookup = createLookup();
    lookup.findByRoles.mockRejectedValue(httpError(500));

    const { result } = renderHook(() => useServiceAccountRoleUsage(lookup, ['viewer']));

    await waitFor(() => expect(result.current).toEqual({ status: 'error' }));
  });
});
