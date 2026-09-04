/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import { MOCK_CONNECTION_CHECK_DELAY_MS } from './data_source_connection_status';
import { mainTranslations } from './main_i18n';
import { useDataSourceConnectionCheck } from './use_data_source_connection_check';

const mockToasts = {
  add: jest.fn((toast) => ({ id: 'toast-id', ...toast })),
  remove: jest.fn(),
  addSuccess: jest.fn(),
  addDanger: jest.fn(),
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { toasts: mockToasts } }),
}));

const finishCheck = async () => {
  await act(async () => {
    jest.advanceTimersByTime(MOCK_CONNECTION_CHECK_DELAY_MS);
  });
};

describe('useDataSourceConnectionCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('reports a check with no progress toast by default', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => useDataSourceConnectionCheck());

    act(() => {
      void result.current.startConnectionCheck('ds1');
    });

    expect(result.current.checkingDataSourceNames).toEqual(new Set(['ds1']));
    expect(mockToasts.add).not.toHaveBeenCalled();

    await finishCheck();

    expect(result.current.checkingDataSourceNames).toEqual(new Set());
    expect(result.current.connectionStatuses.get('ds1')).toBe('connected');
    expect(mockToasts.addSuccess).toHaveBeenCalledWith({
      title: 'Connection successful',
      text: mainTranslations.connectionCheck.successText('ds1'),
    });
  });

  it('shows a progress toast while the check runs and removes it for the result', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => useDataSourceConnectionCheck({ showProgressToast: true }));

    act(() => {
      void result.current.startConnectionCheck('ds1');
    });

    expect(mockToasts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: mainTranslations.columns.dataSources.connectionStatusChecking,
        text: mainTranslations.connectionCheck.progressText('ds1'),
      })
    );
    expect(mockToasts.remove).not.toHaveBeenCalled();
    expect(mockToasts.addSuccess).not.toHaveBeenCalled();

    await finishCheck();

    expect(mockToasts.remove).toHaveBeenCalledWith(mockToasts.add.mock.results[0].value);
    expect(mockToasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  it('reports a failed check as a danger toast', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const { result } = renderHook(() => useDataSourceConnectionCheck({ showProgressToast: true }));

    act(() => {
      void result.current.startConnectionCheck('ds1');
    });
    await finishCheck();

    expect(result.current.connectionStatuses.get('ds1')).toBe('broken');
    expect(mockToasts.remove).toHaveBeenCalledTimes(1);
    expect(mockToasts.addDanger).toHaveBeenCalledWith({
      title: 'Connection failed',
      text: mainTranslations.connectionCheck.errorText('ds1'),
    });
    expect(mockToasts.addSuccess).not.toHaveBeenCalled();
  });

  it('lets a restarted check replace the progress toast and the result of the one before it', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => useDataSourceConnectionCheck({ showProgressToast: true }));

    act(() => {
      void result.current.startConnectionCheck('ds1');
    });
    act(() => {
      void result.current.startConnectionCheck('ds1');
    });

    expect(mockToasts.add).toHaveBeenCalledTimes(2);
    expect(mockToasts.remove).toHaveBeenCalledTimes(1);

    await finishCheck();

    expect(mockToasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(mockToasts.remove).toHaveBeenCalledTimes(2);
  });

  it('drops the progress toast and the result when it unmounts mid-check', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { result, unmount } = renderHook(() =>
      useDataSourceConnectionCheck({ showProgressToast: true })
    );

    act(() => {
      void result.current.startConnectionCheck('ds1');
    });
    unmount();

    expect(mockToasts.remove).toHaveBeenCalledWith(mockToasts.add.mock.results[0].value);

    await finishCheck();

    expect(mockToasts.addSuccess).not.toHaveBeenCalled();
    expect(mockToasts.addDanger).not.toHaveBeenCalled();
  });
});
