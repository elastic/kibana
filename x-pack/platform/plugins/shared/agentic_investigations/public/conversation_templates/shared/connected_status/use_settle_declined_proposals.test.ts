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

  it('tracks each proposal on the shared client, not the caller’s', async () => {
    mockSettle.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSettleDeclinedProposals());

    await act(() => result.current(['p-1', 'p-2']));

    expect(mockSettle).toHaveBeenCalledWith('p-1', mockSharedClient);
    expect(mockSettle).toHaveBeenCalledWith('p-2', mockSharedClient);
  });

  it('refreshes proposals only once every decision has landed', async () => {
    const decision = createDeferred();
    mockSettle.mockReturnValue(decision.promise);
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
    mockSettle.mockImplementation(async () => {
      order.push('settled');
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

    expect(order).toEqual(['settled', 'drop:p-1', 'invalidate']);
  });
});
