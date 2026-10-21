/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { QueryClient } from '@kbn/react-query';
import { useSettleDeclinedProposals } from './use_settle_declined_proposals';
import { statusSignal } from './status_signal';

const mockSettle = jest.fn();
let mockSharedClient: QueryClient;

jest.mock('@kbn/proposals-plugin/public', () => ({
  queryKeys: { proposals: { all: ['proposals'] } },
  useSettleDeclinedProposal: () => mockSettle,
}));

jest.mock('../../../shared_query_client', () => ({
  getSharedInvestigationsQueryClient: () => Promise.resolve(mockSharedClient),
}));

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('useSettleDeclinedProposals', () => {
  let invalidateQueries: jest.SpyInstance;
  let bump: jest.SpyInstance;

  beforeEach(() => {
    mockSharedClient = new QueryClient();
    invalidateQueries = jest.spyOn(mockSharedClient, 'invalidateQueries');
    bump = jest.spyOn(statusSignal, 'bump');
    mockSettle.mockReset();
  });

  afterEach(() => {
    bump.mockRestore();
  });

  it('does nothing when there are no declined proposals', async () => {
    const { result } = renderHook(() => useSettleDeclinedProposals());

    await act(() => result.current([]));

    expect(mockSettle).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(bump).not.toHaveBeenCalled();
  });

  // Acts like the real tracker: it waits for the decision, then runs `afterDecision`, and only
  // then ends.
  const trackerFor =
    (decision: Promise<void>) =>
    async (_id: string, _client: QueryClient, afterDecision?: () => Promise<void>) => {
      await decision;
      await afterDecision?.();
    };

  it('tracks each proposal on the shared client, not the caller’s', async () => {
    mockSettle.mockImplementation(trackerFor(Promise.resolve()));
    const { result } = renderHook(() => useSettleDeclinedProposals());

    await act(() => result.current(['p-1', 'p-2']));

    expect(mockSettle).toHaveBeenCalledWith('p-1', mockSharedClient, expect.any(Function));
    expect(mockSettle).toHaveBeenCalledWith('p-2', mockSharedClient, expect.any(Function));
  });

  it('refreshes proposals only once every decision has landed', async () => {
    const decision = createDeferred();
    mockSettle.mockImplementation(trackerFor(decision.promise));
    const { result } = renderHook(() => useSettleDeclinedProposals());

    let done!: Promise<void>;
    await act(async () => {
      done = result.current(['p-1']);
    });

    expect(mockSettle).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(bump).not.toHaveBeenCalled();

    await act(async () => {
      decision.resolve();
      await done;
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['proposals'] });
    expect(bump).toHaveBeenCalledTimes(1);
  });

  it('drops the rows from the host queue after the decisions land and before refreshing', async () => {
    const order: string[] = [];
    mockSettle.mockImplementation(async (_id, _client, afterDecision) => {
      order.push('decided');
      await afterDecision?.();
    });
    const dropDecidedProposal = jest.fn(async (id: string) => {
      order.push(`drop:${id}`);
    });
    invalidateQueries.mockImplementation(() => {
      order.push('invalidate');
      return Promise.resolve();
    });
    const { result } = renderHook(() => useSettleDeclinedProposals(dropDecidedProposal));

    await act(() => result.current(['p-1']));

    expect(order).toEqual(['decided', 'drop:p-1', 'invalidate']);
  });

  it('keeps every tracker open until one refresh has ended, so no row reads old data', async () => {
    const first = createDeferred();
    const second = createDeferred();
    const refresh = createDeferred();
    const ended: string[] = [];
    mockSettle.mockImplementation(async (id, client, afterDecision) => {
      await (id === 'p-1' ? first.promise : second.promise);
      await afterDecision?.();
      ended.push(id);
    });
    invalidateQueries.mockReturnValue(refresh.promise);
    const { result } = renderHook(() => useSettleDeclinedProposals());

    let done!: Promise<void>;
    await act(async () => {
      done = result.current(['p-1', 'p-2']);
    });
    await act(async () => {
      first.resolve();
    });
    // One decision is still missing: no refresh yet, and the first tracker waits.
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(ended).toEqual([]);

    await act(async () => {
      second.resolve();
    });
    // Both decisions landed. The refresh runs once, and both trackers still wait for it.
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(ended).toEqual([]);

    await act(async () => {
      refresh.resolve();
      await done;
    });
    expect(ended.sort()).toEqual(['p-1', 'p-2']);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('releases every tracker, and reports the error, when the host drop callback rejects', async () => {
    const ended: string[] = [];
    mockSettle.mockImplementation(async (id, client, afterDecision) => {
      await afterDecision?.();
      ended.push(id);
    });
    invalidateQueries.mockResolvedValue(undefined);
    const dropDecidedProposal = jest.fn().mockRejectedValue(new Error('drop failed'));
    const { result } = renderHook(() => useSettleDeclinedProposals(dropDecidedProposal));

    await act(async () => {
      await expect(result.current(['p-1', 'p-2'])).rejects.toThrow('drop failed');
    });

    expect(ended.sort()).toEqual(['p-1', 'p-2']);
    expect(bump).toHaveBeenCalledTimes(1);
  });

  it('releases every tracker, and reports the error, when the refresh rejects', async () => {
    const ended: string[] = [];
    mockSettle.mockImplementation(async (id, client, afterDecision) => {
      await afterDecision?.();
      ended.push(id);
    });
    invalidateQueries.mockRejectedValue(new Error('refresh failed'));
    const { result } = renderHook(() => useSettleDeclinedProposals());

    await act(async () => {
      await expect(result.current(['p-1'])).rejects.toThrow('refresh failed');
    });

    expect(ended).toEqual(['p-1']);
  });

  it('does not hold the other trackers open when one tracker fails', async () => {
    mockSettle.mockImplementation(async (id, client, afterDecision) => {
      if (id === 'p-1') {
        throw new Error('tracker failed');
      }
      await afterDecision?.();
    });
    invalidateQueries.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSettleDeclinedProposals());

    await act(async () => {
      await expect(result.current(['p-1', 'p-2'])).rejects.toThrow('tracker failed');
    });

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });
});
