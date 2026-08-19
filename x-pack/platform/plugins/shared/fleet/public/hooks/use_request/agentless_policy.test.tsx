/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import { focusManager } from '@kbn/react-query';

import { createFleetTestRendererMock } from '../../mock';

import { sendRequestForRq } from './use_request';
import { useUpgradeAgentlessPoliciesDryRunQuery } from './agentless_policy';

jest.mock('./use_request', () => ({
  ...jest.requireActual('./use_request'),
  sendRequestForRq: jest.fn(),
}));

// The upgrade dry run is a POST that react-query treats as a query. These tests pin down that it
// behaves as a point-in-time read: exactly one request per (ids, version) pair, with none of the
// default refetch triggers (window focus, remount, list reorder) silently repeating the POST.
describe('useUpgradeAgentlessPoliciesDryRunQuery', () => {
  beforeEach(() => {
    jest.mocked(sendRequestForRq).mockClear();
    jest.mocked(sendRequestForRq).mockResolvedValue([{ id: 'agentless-1', hasErrors: false }]);
  });

  // NOTE: the Fleet test renderer shares one QueryClient across tests in this file, so each test
  // uses a distinct policy-id set to get its own cache entry.

  it('fires the dry run once and does not refetch it on window focus', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      useUpgradeAgentlessPoliciesDryRunQuery(['focus-1', 'focus-2'], '2.0.0')
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sendRequestForRq).toHaveBeenCalledTimes(1);

    // Simulate the browser window losing and regaining focus.
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    // Let any (wrongly) scheduled refetch kick off before asserting.
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(sendRequestForRq).toHaveBeenCalledTimes(1);
    act(() => {
      focusManager.setFocused(undefined);
    });
  });

  it('does not treat a reordered id list as a new dry run', async () => {
    let policyIds = ['reorder-b', 'reorder-a'];
    const renderer = createFleetTestRendererMock();
    const { result, rerender } = renderer.renderHook(() =>
      useUpgradeAgentlessPoliciesDryRunQuery(policyIds, '2.0.0')
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // A refetch of the source package-policies list can yield the same ids in another order.
    policyIds = ['reorder-a', 'reorder-b'];
    rerender();
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(sendRequestForRq).toHaveBeenCalledTimes(1);
  });

  it('defaults to disabled when there are no policy ids', async () => {
    const renderer = createFleetTestRendererMock();
    renderer.renderHook(() => useUpgradeAgentlessPoliciesDryRunQuery([]));

    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(sendRequestForRq).not.toHaveBeenCalled();
  });
});
