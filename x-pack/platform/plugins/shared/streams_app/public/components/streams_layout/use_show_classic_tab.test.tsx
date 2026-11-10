/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useShowClassicTab } from './use_show_classic_tab';

const mockFetch = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: { start: { streams: { streamsRepositoryClient: { fetch: mockFetch } } } },
  }),
}));
jest.mock('../../hooks/use_streams_privileges', () => ({ useStreamsPrivileges: jest.fn() }));

const setup = ({ legacy = true, v2 = true }: { legacy?: boolean; v2?: boolean } = {}) => {
  jest.mocked(useStreamsPrivileges).mockReturnValue({
    access: { legacy, v2 },
  } as unknown as ReturnType<typeof useStreamsPrivileges>);

  // Silences react-query's log for the failing check.
  const queryClient = new QueryClient({
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
};

describe('useShowClassicTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ['legacy', { legacy: false }],
    ['V2', { v2: false }],
  ])('skips the check without %s access', (_, access) => {
    const { wrapper } = setup(access);
    const { result } = renderHook(() => useShowClassicTab(), { wrapper });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current).toEqual({ loading: false, showClassic: false });
  });

  it('hides the tab when only root streams exist', async () => {
    mockFetch.mockResolvedValue({ streams: [{ name: 'logs.otel', type: 'wired' }] });
    const { wrapper } = setup();
    const { result } = renderHook(() => useShowClassicTab(), { wrapper });

    await waitFor(() => expect(result.current).toEqual({ loading: false, showClassic: false }));
  });

  it('keeps the tab when the check fails', async () => {
    mockFetch.mockRejectedValue(new Error('Forbidden'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useShowClassicTab(), { wrapper });

    await waitFor(() => expect(result.current).toEqual({ loading: false, showClassic: true }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['an answer', () => mockFetch.mockResolvedValue({ streams: [] })],
    ['a failed check', () => mockFetch.mockRejectedValue(new Error('Forbidden'))],
  ])('keeps %s after the tabs are gone for longer than the cache time', async (_, mockAnswer) => {
    jest.useFakeTimers();
    mockAnswer();
    const { wrapper } = setup();
    const redirect = renderHook(() => useShowClassicTab(), { wrapper });
    await waitFor(() => expect(redirect.result.current.loading).toBe(false));
    redirect.unmount();

    // react-query drops an unused query after its cache time, 5 minutes by default.
    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    const layout = renderHook(() => useShowClassicTab(), { wrapper });

    expect(layout.result.current.loading).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
