/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

jest.mock('../services');
jest.mock('../utils/fetch_esql_data');
jest.mock('@kbn/esql-utils', () => ({
  getESQLTimeFieldFromQuery: jest.fn(),
}));

import { getServices } from '../services';
import { fetchEsqlData } from '../utils/fetch_esql_data';
import { getESQLTimeFieldFromQuery } from '@kbn/esql-utils';
import { useEditFlyoutState } from './use_edit_flyout_state';

const mockHttp = {
  get: jest.fn(),
} as any;

const mockSearch = {} as any;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  (getServices as jest.Mock).mockReturnValue({ search: mockSearch, core: { http: mockHttp } });
  mockHttp.get.mockResolvedValue({ connectors: [] });
  (getESQLTimeFieldFromQuery as jest.Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

const baseParams = {
  prompt: 'Show KPI cards',
  esqlQuery: undefined,
  template: undefined,
  timeRange: undefined,
};

describe('useEditFlyoutState', () => {
  describe('initial state', () => {
    it('initialises draft values from props', () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQuery: 'FROM logs', template: '<p>hi</p>' })
      );
      expect(result.current.draftPrompt).toBe('Show KPI cards');
      expect(result.current.draftEsqlQuery).toBe('FROM logs');
      expect(result.current.draftTemplate).toBe('<p>hi</p>');
      expect(result.current.isAiAvailable).toBeUndefined();
      expect(result.current.previewData).toBeNull();
    });
  });

  describe('connector availability check', () => {
    it('sets isAiAvailable true when connectors exist', async () => {
      mockHttp.get.mockResolvedValue({ connectors: [{ id: 'c1' }] });
      const { result } = renderHook(() => useEditFlyoutState(baseParams));
      await waitFor(() => expect(result.current.isAiAvailable).toBe(true));
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('sets isAiAvailable false when no connectors', async () => {
      mockHttp.get.mockResolvedValue({ connectors: [] });
      const { result } = renderHook(() => useEditFlyoutState(baseParams));
      await waitFor(() => expect(result.current.isAiAvailable).toBe(false));
    });

    it('sets isAiAvailable false on request error', async () => {
      mockHttp.get.mockRejectedValue(new Error('network error'));
      const { result } = renderHook(() => useEditFlyoutState(baseParams));
      await waitFor(() => expect(result.current.isAiAvailable).toBe(false));
    });

    it('does not set state after unmount', async () => {
      let resolve: (v: unknown) => void;
      mockHttp.get.mockReturnValue(new Promise((r) => (resolve = r)));
      const { unmount } = renderHook(() => useEditFlyoutState(baseParams));
      unmount();
      act(() => resolve({ connectors: [{ id: 'c1' }] }));
      // no state update errors expected
    });
  });

  describe('time field detection', () => {
    it('debounces the time field lookup by 300ms', async () => {
      (getESQLTimeFieldFromQuery as jest.Mock).mockResolvedValue('order_date');
      const { result } = renderHook(() => useEditFlyoutState({ ...baseParams, esqlQuery: '' }));

      act(() => result.current.setDraftEsqlQuery('FROM ecommerce'));
      expect(getESQLTimeFieldFromQuery).not.toHaveBeenCalled();

      act(() => jest.advanceTimersByTime(300));
      await waitFor(() => expect(result.current.detectedTimeField).toBe('order_date'));
    });

    it('clears detectedTimeField when query is emptied', () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQuery: 'FROM ecommerce' })
      );
      act(() => result.current.setDraftEsqlQuery(''));
      expect(result.current.detectedTimeField).toBeUndefined();
      expect(getESQLTimeFieldFromQuery).not.toHaveBeenCalled();
    });

    it('cancels a pending lookup when query changes again within debounce window', async () => {
      const { result } = renderHook(() => useEditFlyoutState({ ...baseParams, esqlQuery: '' }));

      act(() => result.current.setDraftEsqlQuery('FROM a'));
      act(() => jest.advanceTimersByTime(100));
      act(() => result.current.setDraftEsqlQuery('FROM ab'));
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => expect(getESQLTimeFieldFromQuery).toHaveBeenCalledTimes(1));
      expect((getESQLTimeFieldFromQuery as jest.Mock).mock.calls[0][0].query).toBe('FROM ab');
    });
  });

  describe('setDraftEsqlQuery', () => {
    it('resets preview data and error when query changes', async () => {
      (fetchEsqlData as jest.Mock).mockResolvedValue({
        columns: [{ name: 'count', type: 'long' }],
        values: [[42]],
      });
      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQuery: 'FROM logs' })
      );

      await act(() => result.current.handlePreview());
      expect(result.current.previewData).not.toBeNull();

      act(() => result.current.setDraftEsqlQuery('FROM other'));
      expect(result.current.previewData).toBeNull();
      expect(result.current.previewError).toBeNull();
    });
  });

  describe('handlePreview', () => {
    it('sets previewData on success', async () => {
      const mockResult = {
        columns: [{ name: 'category', type: 'keyword' }],
        values: [['electronics'], ['clothing']],
      };
      (fetchEsqlData as jest.Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQuery: 'FROM ecommerce' })
      );

      await act(() => result.current.handlePreview());

      expect(result.current.previewData).toEqual(mockResult);
      expect(result.current.isPreviewLoading).toBe(false);
      expect(result.current.previewError).toBeNull();
    });

    it('sets previewError on failure', async () => {
      (fetchEsqlData as jest.Mock).mockRejectedValue(new Error('query failed'));

      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQuery: 'FROM ecommerce' })
      );

      await act(() => result.current.handlePreview());

      expect(result.current.previewData).toBeNull();
      expect(result.current.previewError).toBe('query failed');
      expect(result.current.isPreviewLoading).toBe(false);
    });

    it('does nothing when query is empty', async () => {
      const { result } = renderHook(() => useEditFlyoutState(baseParams));
      await act(() => result.current.handlePreview());
      expect(fetchEsqlData).not.toHaveBeenCalled();
    });
  });
});
