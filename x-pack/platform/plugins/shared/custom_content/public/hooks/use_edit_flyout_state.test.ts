/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { EuiThemeComputed } from '@elastic/eui';

jest.mock('../services');
jest.mock('@kbn/custom-content-renderer');
jest.mock('@kbn/data-plugin/public', () => ({ getEsQueryConfig: jest.fn() }));

import type { HttpStart } from '@kbn/core/public';
import {
  fetchEsqlData,
  fillTemplate,
  sanitizeHtml,
  applyHtmlTheme,
} from '@kbn/custom-content-renderer';
import { getServices } from '../services';
import { useEditFlyoutState } from './use_edit_flyout_state';

const mockFetchEsqlData = fetchEsqlData as jest.MockedFunction<typeof fetchEsqlData>;
const mockFillTemplate = fillTemplate as jest.MockedFunction<typeof fillTemplate>;
const mockSanitizeHtml = sanitizeHtml as jest.MockedFunction<typeof sanitizeHtml>;
const mockApplyHtmlTheme = applyHtmlTheme as jest.MockedFunction<typeof applyHtmlTheme>;

const mockHttp = {} as unknown as HttpStart;
const mockSearch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getServices as jest.Mock).mockReturnValue({
    core: { http: mockHttp, uiSettings: {} },
    search: mockSearch,
    agentBuilder: undefined,
  });
  mockFetchEsqlData.mockResolvedValue({ columns: [], values: [], all_columns: [] });
  mockFillTemplate.mockResolvedValue('<p>filled</p>');
  mockSanitizeHtml.mockImplementation((h) => h);
  mockApplyHtmlTheme.mockReturnValue('<html>prepared</html>');
});

const mockOnRunPreview = jest.fn();

const mockEuiTheme = {} as unknown as EuiThemeComputed;

const baseParams = {
  esqlQuery: 'FROM logs | LIMIT 10',
  template: 'hello',
  timeRange: undefined,
  colorMode: 'LIGHT' as const,
  euiTheme: mockEuiTheme,
  isApproximate: false,
  projectRouting: undefined,
  query: undefined,
  filters: undefined,
  esqlVariables: undefined,
  onRunPreview: mockOnRunPreview,
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
        useEditFlyoutState({
          esqlQuery: undefined,
          template: undefined,
          timeRange: undefined,
          colorMode: 'LIGHT' as const,
          euiTheme: mockEuiTheme,
          isApproximate: false,
          projectRouting: undefined,
          query: undefined,
          filters: undefined,
          esqlVariables: undefined,
          onRunPreview: mockOnRunPreview,
        })
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

  describe('handleFetchData', () => {
    it('sets esqlData on success', async () => {
      const mockResult = {
        columns: [{ name: 'count', type: 'long' }],
        values: [[42]],
        all_columns: [],
      };
      mockFetchEsqlData.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handleFetchData();
      });

      expect(result.current.esqlData).toEqual(mockResult);
      expect(result.current.esqlDataError).toBeNull();
    });

    it('sets esqlDataError on failure', async () => {
      mockFetchEsqlData.mockRejectedValue(new Error('query failed'));

      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handleFetchData();
      });

      expect(result.current.esqlDataError).toBe('query failed');
      expect(result.current.esqlData).toBeNull();
    });

    it('does nothing when draftEsqlQuery is empty', async () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({
          esqlQuery: undefined,
          template: undefined,
          timeRange: undefined,
          colorMode: 'LIGHT' as const,
          euiTheme: mockEuiTheme,
          isApproximate: false,
          projectRouting: undefined,
          query: undefined,
          filters: undefined,
          esqlVariables: undefined,
          onRunPreview: mockOnRunPreview,
        })
      );

      await act(async () => {
        await result.current.handleFetchData();
      });

      expect(mockFetchEsqlData).not.toHaveBeenCalled();
      expect(result.current.esqlData).toBeNull();
      expect(result.current.esqlDataError).toBeNull();
    });
  });

  describe('handleRender', () => {
    it('calls onRunPreview with prepared html when esql query is set', async () => {
      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handleRender();
      });

      expect(mockFetchEsqlData).toHaveBeenCalled();
      expect(mockFillTemplate).toHaveBeenCalled();
      expect(mockSanitizeHtml).toHaveBeenCalledWith('<p>filled</p>');
      expect(mockApplyHtmlTheme).toHaveBeenCalledWith('<p>filled</p>', 'LIGHT', mockEuiTheme);
      expect(mockOnRunPreview).toHaveBeenCalledWith('<html>prepared</html>');
    });

    it('skips fetch and uses draft template directly when no esql query', async () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQuery: undefined })
      );

      await act(async () => {
        await result.current.handleRender();
      });

      expect(mockFetchEsqlData).not.toHaveBeenCalled();
      expect(mockFillTemplate).not.toHaveBeenCalled();
      expect(mockSanitizeHtml).toHaveBeenCalledWith('hello');
      expect(mockApplyHtmlTheme).toHaveBeenCalledWith('hello', 'LIGHT', mockEuiTheme);
      expect(mockOnRunPreview).toHaveBeenCalledWith('<html>prepared</html>');
    });

    it('sets esqlDataError and does not call onRunPreview on fetch failure', async () => {
      mockFetchEsqlData.mockRejectedValue(new Error('fetch failed'));
      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handleRender();
      });

      expect(mockOnRunPreview).not.toHaveBeenCalled();
      expect(result.current.esqlDataError).toBe('fetch failed');
    });

    it('clears a stale esqlDataError when a subsequent render succeeds', async () => {
      mockFetchEsqlData.mockRejectedValueOnce(new Error('fetch failed'));
      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handleRender();
      });
      expect(result.current.esqlDataError).toBe('fetch failed');

      mockFetchEsqlData.mockResolvedValueOnce({ columns: [], values: [], all_columns: [] });

      await act(async () => {
        await result.current.handleRender();
      });

      expect(result.current.esqlDataError).toBeNull();
      expect(mockOnRunPreview).toHaveBeenCalledTimes(1);
    });

    it('does not call onRunPreview when the draft changed mid-flight', async () => {
      let resolveRender!: () => void;
      mockFetchEsqlData.mockReturnValue(
        new Promise((resolve) => {
          resolveRender = () => resolve({ columns: [], values: [], all_columns: [] });
        })
      );

      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      act(() => {
        result.current.handleRender();
      });
      expect(result.current.isRenderLoading).toBe(true);

      act(() => {
        result.current.setDraftEsqlQuery('FROM logs | LIMIT 5');
      });

      await act(async () => {
        resolveRender();
      });

      expect(result.current.isRenderLoading).toBe(false);
      expect(mockOnRunPreview).not.toHaveBeenCalled();
    });

    it('shows loading state while rendering', async () => {
      let resolvePromise!: () => void;
      mockFetchEsqlData.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = () => resolve({ columns: [], values: [], all_columns: [] });
        })
      );

      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      act(() => {
        result.current.handleRender();
      });
      expect(result.current.isRenderLoading).toBe(true);

      await act(async () => {
        resolvePromise();
      });
      expect(result.current.isRenderLoading).toBe(false);
    });
  });
});
