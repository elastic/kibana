/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

jest.mock('../services');
jest.mock('../utils/fetch_esql_data');

import type { HttpStart } from '@kbn/core/public';
import { getServices } from '../services';
import { fetchEsqlData } from '../utils/fetch_esql_data';
import { useEditFlyoutState } from './use_edit_flyout_state';

const mockFetchEsqlData = fetchEsqlData as jest.MockedFunction<typeof fetchEsqlData>;

const mockHttp = {} as unknown as HttpStart;
const mockSearch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getServices as jest.Mock).mockReturnValue({
    core: { http: mockHttp },
    search: mockSearch,
    agentBuilder: undefined,
  });
  mockFetchEsqlData.mockResolvedValue({ columns: [], values: [], all_columns: [] });
});

const baseParams = {
  esqlQuery: 'FROM logs | LIMIT 10',
  template: 'hello',
  timeRange: undefined,
};

describe('useEditFlyoutState', () => {
  describe('initial state', () => {
    it('initializes draft state from props', () => {
      const { result } = renderHook(() => useEditFlyoutState(baseParams));
      expect(result.current.draftEsqlQuery).toBe('FROM logs | LIMIT 10');
      expect(result.current.draftTemplate).toBe('hello');
    });

    it('initializes draft state to empty strings when props are undefined', () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({ esqlQuery: undefined, template: undefined, timeRange: undefined })
      );
      expect(result.current.draftEsqlQuery).toBe('');
      expect(result.current.draftTemplate).toBe('');
    });
  });

  describe('isAiAvailable', () => {
    it('is false when agentBuilder is undefined', () => {
      const { result } = renderHook(() => useEditFlyoutState(baseParams));
      expect(result.current.isAiAvailable).toBe(false);
    });

    it('is true when agentBuilder is defined', () => {
      (getServices as jest.Mock).mockReturnValue({
        core: { http: mockHttp },
        search: mockSearch,
        agentBuilder: {},
      });
      const { result } = renderHook(() => useEditFlyoutState(baseParams));
      expect(result.current.isAiAvailable).toBe(true);
    });
  });

  describe('handlePreview', () => {
    it('sets previewData on success', async () => {
      const mockResult = {
        columns: [{ name: 'count', type: 'long' }],
        values: [[42]],
        all_columns: [],
      };
      mockFetchEsqlData.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handlePreview();
      });

      expect(result.current.previewData).toEqual(mockResult);
      expect(result.current.previewError).toBeNull();
    });

    it('sets previewError on failure', async () => {
      mockFetchEsqlData.mockRejectedValue(new Error('query failed'));

      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handlePreview();
      });

      expect(result.current.previewError).toBe('query failed');
      expect(result.current.previewData).toBeNull();
    });

    it('does nothing when draftEsqlQuery is empty', async () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({ esqlQuery: undefined, template: undefined, timeRange: undefined })
      );

      await act(async () => {
        await result.current.handlePreview();
      });

      expect(mockFetchEsqlData).not.toHaveBeenCalled();
      expect(result.current.previewData).toBeNull();
      expect(result.current.previewError).toBeNull();
    });
  });
});
