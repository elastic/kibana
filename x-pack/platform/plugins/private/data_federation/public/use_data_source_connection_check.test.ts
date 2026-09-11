/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import { MOCK_CONNECTION_CHECK_DELAY_MS } from './data_source_connection_status';
import { useDataSourceConnectionCheck } from './use_data_source_connection_check';

const finishCheck = async () => {
  await act(async () => {
    jest.advanceTimersByTime(MOCK_CONNECTION_CHECK_DELAY_MS);
  });
};

describe('useDataSourceConnectionCheck', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('tracks checking state and stores a successful result', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => useDataSourceConnectionCheck());

    act(() => {
      void result.current.startConnectionCheck('ds1');
    });

    expect(result.current.checkingDataSourceNames).toEqual(new Set(['ds1']));

    await finishCheck();

    expect(result.current.checkingDataSourceNames).toEqual(new Set());
    expect(result.current.connectionStatuses.get('ds1')).toBe('connected');
  });

  it('stores a failed check result', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const { result } = renderHook(() => useDataSourceConnectionCheck());

    act(() => {
      void result.current.startConnectionCheck('ds1');
    });
    await finishCheck();

    expect(result.current.connectionStatuses.get('ds1')).toBe('broken');
  });

  it('discards the result of a superseded check', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => useDataSourceConnectionCheck());

    act(() => {
      void result.current.startConnectionCheck('ds1');
    });
    act(() => {
      void result.current.startConnectionCheck('ds1');
    });

    await finishCheck();

    expect(result.current.connectionStatuses.get('ds1')).toBe('connected');
  });

  it('does not store a result after unmount', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result, unmount } = renderHook(() => useDataSourceConnectionCheck());

    act(() => {
      void result.current.startConnectionCheck('ds1');
    });
    unmount();

    await finishCheck();
  });
});
