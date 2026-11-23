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
  fetchEsqlDatasets,
  getLinkBasePath,
  fillTemplateDatasets,
  sanitizeHtml,
  applyHtmlTheme,
} from '@kbn/custom-content-renderer';
import { CUSTOM_CONTENT_MAX_ESQL_QUERIES } from '@kbn/custom-content-common';
import { getServices } from '../services';
import { useEditFlyoutState } from './use_edit_flyout_state';

const mockFetchEsqlData = fetchEsqlData as jest.MockedFunction<typeof fetchEsqlData>;
const mockFetchEsqlDatasets = fetchEsqlDatasets as jest.MockedFunction<typeof fetchEsqlDatasets>;
const noData = { datasets: [{ columns: [], rows: [] }], approximationApplied: undefined };
const mockFillTemplate = fillTemplateDatasets as jest.MockedFunction<typeof fillTemplateDatasets>;
const mockSanitizeHtml = sanitizeHtml as jest.MockedFunction<typeof sanitizeHtml>;
const mockApplyHtmlTheme = applyHtmlTheme as jest.MockedFunction<typeof applyHtmlTheme>;

const mockLinkBasePath = { requestBasePath: '/s/my-space', serverBasePath: '' };
const mockHttp = { basePath: { get: () => '' } } as unknown as HttpStart;
const mockSearch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getServices as jest.Mock).mockReturnValue({
    core: { http: mockHttp, uiSettings: {} },
    search: mockSearch,
    agentBuilder: undefined,
  });
  mockFetchEsqlData.mockResolvedValue({ columns: [], values: [], all_columns: [] });
  mockFetchEsqlDatasets.mockResolvedValue(noData);
  mockFillTemplate.mockResolvedValue('<p>filled</p>');
  (getLinkBasePath as jest.Mock).mockReturnValue(mockLinkBasePath);
  mockSanitizeHtml.mockImplementation((h) => h);
  mockApplyHtmlTheme.mockReturnValue('<html>prepared</html>');
});

const mockOnRunPreview = jest.fn();

const mockEuiTheme = {} as unknown as EuiThemeComputed;

const baseParams = {
  esqlQueries: ['FROM logs | LIMIT 10'],
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
      expect(result.current.draftQueries.map(({ text }) => text)).toEqual(['FROM logs | LIMIT 10']);
      expect(result.current.draftTemplate).toBe('hello');
    });

    it('keeps every query of the panel, in order', () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQueries: ['FROM a', 'FROM b'] })
      );
      expect(result.current.draftQueries.map(({ text }) => text)).toEqual(['FROM a', 'FROM b']);
    });

    it('starts a panel without a query with an empty first one to type into', () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({
          esqlQueries: [],
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
      expect(result.current.draftQueries.map(({ text }) => text)).toEqual(['']);
      expect(result.current.draftTemplate).toBe('');
    });
  });

  describe('editing queries', () => {
    it('adds a query once the first one is filled in, up to the maximum', () => {
      const { result } = renderHook(() => useEditFlyoutState(baseParams));
      expect(result.current.canAddQuery).toBe(true);

      act(() => result.current.addQuery());
      expect(result.current.draftQueries).toHaveLength(2);

      Array.from({ length: CUSTOM_CONTENT_MAX_ESQL_QUERIES }).forEach(() =>
        act(() => result.current.addQuery())
      );
      expect(result.current.canAddQuery).toBe(false);
    });

    it('cannot add a query while the first is empty', () => {
      const { result } = renderHook(() => useEditFlyoutState({ ...baseParams, esqlQueries: [] }));
      expect(result.current.canAddQuery).toBe(false);
    });

    it('reports a blank query that others follow, and keeps it in place', () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQueries: ['FROM a', '', 'FROM c'] })
      );
      expect(result.current.emptyQueryPosition).toBe(2);
    });

    it('stops the fetch of a query that is removed', async () => {
      let signal: AbortSignal | undefined;
      mockFetchEsqlData.mockImplementation((_s, _h, _q, _t, abortSignal) => {
        signal = abortSignal;
        return new Promise(() => {});
      });
      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQueries: ['FROM a', 'FROM b'] })
      );
      const [, second] = result.current.draftQueries;

      act(() => {
        result.current.fetchQueryData(second.id);
      });
      act(() => result.current.removeQuery(second.id));

      expect(signal?.aborted).toBe(true);
    });

    it('changes and removes a query by its id', () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQueries: ['FROM a', 'FROM b'] })
      );
      const [, second] = result.current.draftQueries;

      act(() => result.current.setQueryText(second.id, 'FROM c'));
      expect(result.current.draftQueries.map(({ text }) => text)).toEqual(['FROM a', 'FROM c']);

      act(() => result.current.removeQuery(second.id));
      expect(result.current.draftQueries.map(({ text }) => text)).toEqual(['FROM a']);
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

  describe('fetchQueryData', () => {
    it('keeps the data of a query on success', async () => {
      const mockResult = {
        columns: [{ name: 'count', type: 'long' }],
        values: [[42]],
        all_columns: [],
      };
      mockFetchEsqlData.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.fetchQueryData(result.current.draftQueries[0].id);
      });

      expect(result.current.draftQueries[0].esqlData).toEqual(mockResult);
      expect(result.current.draftQueries[0].esqlDataError).toBeNull();
    });

    it('keeps the error of a query on failure, without touching the others', async () => {
      mockFetchEsqlData.mockRejectedValue(new Error('query failed'));

      const { result } = renderHook(() =>
        useEditFlyoutState({ ...baseParams, esqlQueries: ['FROM a', 'FROM b'] })
      );

      await act(async () => {
        await result.current.fetchQueryData(result.current.draftQueries[1].id);
      });

      expect(result.current.draftQueries[1].esqlDataError).toBe('query failed');
      expect(result.current.draftQueries[0].esqlDataError).toBeNull();
    });

    it('does nothing for an empty query', async () => {
      const { result } = renderHook(() => useEditFlyoutState({ ...baseParams, esqlQueries: [] }));

      await act(async () => {
        await result.current.fetchQueryData(result.current.draftQueries[0].id);
      });

      expect(mockFetchEsqlData).not.toHaveBeenCalled();
    });
  });

  describe('handleRender', () => {
    it('calls onRunPreview with prepared html when esql query is set', async () => {
      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handleRender();
      });

      expect(mockFetchEsqlDatasets).toHaveBeenCalled();
      expect(mockFillTemplate).toHaveBeenCalled();
      expect(mockSanitizeHtml).toHaveBeenCalledWith('<p>filled</p>', mockLinkBasePath);
      expect(mockApplyHtmlTheme).toHaveBeenCalledWith('<p>filled</p>', 'LIGHT', mockEuiTheme);
      expect(mockOnRunPreview).toHaveBeenCalledWith('<html>prepared</html>');
    });

    it('fetches every query of the panel and fills the template with one dataset per query', async () => {
      const columns = [{ name: 'n', type: 'long' }];
      const datasets = [
        { columns, rows: [[1]] },
        { columns, rows: [[2]] },
      ];
      mockFetchEsqlDatasets.mockResolvedValueOnce({
        datasets,
        approximationApplied: undefined,
      });

      const { result } = renderHook(() =>
        useEditFlyoutState({
          ...baseParams,
          esqlQueries: [...baseParams.esqlQueries, 'FROM metrics | LIMIT 5'],
        })
      );

      await act(async () => {
        await result.current.handleRender();
      });

      expect(mockFetchEsqlDatasets).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        ['FROM logs | LIMIT 10', 'FROM metrics | LIMIT 5'],
        undefined,
        expect.any(AbortSignal),
        expect.anything()
      );
      expect(mockFillTemplate).toHaveBeenCalledWith('hello', datasets);
      expect(mockOnRunPreview).toHaveBeenCalledWith('<html>prepared</html>');
    });

    it("fetches queries added in the editor, not only the panel's own", async () => {
      const { result } = renderHook(() => useEditFlyoutState(baseParams));
      act(() => result.current.addQuery());
      act(() => result.current.setQueryText(result.current.draftQueries[1].id, 'FROM metrics'));

      await act(async () => {
        await result.current.handleRender();
      });

      expect(mockFetchEsqlDatasets).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        ['FROM logs | LIMIT 10', 'FROM metrics'],
        undefined,
        expect.any(AbortSignal),
        expect.anything()
      );
    });

    it('fetches only the first query for a single-query panel, as before', async () => {
      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handleRender();
      });

      expect(mockFetchEsqlDatasets).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        ['FROM logs | LIMIT 10'],
        undefined,
        expect.any(AbortSignal),
        expect.anything()
      );
      expect(mockFillTemplate).toHaveBeenCalledWith('hello', [{ columns: [], rows: [] }]);
    });

    it('does not fetch the other queries once the first query is cleared in the editor', async () => {
      const { result } = renderHook(() =>
        useEditFlyoutState({
          ...baseParams,
          esqlQueries: ['FROM logs', 'FROM metrics'],
        })
      );
      act(() => result.current.setQueryText(result.current.draftQueries[0].id, ''));

      await act(async () => {
        await result.current.handleRender();
      });

      expect(mockFetchEsqlDatasets).not.toHaveBeenCalled();
      expect(mockOnRunPreview).toHaveBeenCalledWith('<html>prepared</html>');
    });

    it('skips fetch and uses draft template directly when no esql query', async () => {
      const { result } = renderHook(() => useEditFlyoutState({ ...baseParams, esqlQueries: [] }));

      await act(async () => {
        await result.current.handleRender();
      });

      expect(mockFetchEsqlDatasets).not.toHaveBeenCalled();
      expect(mockFillTemplate).not.toHaveBeenCalled();
      expect(mockSanitizeHtml).toHaveBeenCalledWith('hello', mockLinkBasePath);
      expect(mockApplyHtmlTheme).toHaveBeenCalledWith('hello', 'LIGHT', mockEuiTheme);
      expect(mockOnRunPreview).toHaveBeenCalledWith('<html>prepared</html>');
    });

    it('sets renderError and does not call onRunPreview on fetch failure', async () => {
      mockFetchEsqlDatasets.mockRejectedValue(new Error('fetch failed'));
      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handleRender();
      });

      expect(mockOnRunPreview).not.toHaveBeenCalled();
      expect(result.current.renderError).toBe('fetch failed');
    });

    it('clears a stale renderError when a subsequent render succeeds', async () => {
      mockFetchEsqlDatasets.mockRejectedValueOnce(new Error('fetch failed'));
      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      await act(async () => {
        await result.current.handleRender();
      });
      expect(result.current.renderError).toBe('fetch failed');

      mockFetchEsqlDatasets.mockResolvedValueOnce(noData);

      await act(async () => {
        await result.current.handleRender();
      });

      expect(result.current.renderError).toBeNull();
      expect(mockOnRunPreview).toHaveBeenCalledTimes(1);
    });

    it('does not call onRunPreview when the draft changed mid-flight', async () => {
      let resolveRender!: () => void;
      mockFetchEsqlDatasets.mockReturnValue(
        new Promise((resolve) => {
          resolveRender = () => resolve(noData);
        })
      );

      const { result } = renderHook(() => useEditFlyoutState(baseParams));

      act(() => {
        result.current.handleRender();
      });
      expect(result.current.isRenderLoading).toBe(true);

      act(() => {
        result.current.setQueryText(result.current.draftQueries[0].id, 'FROM logs | LIMIT 5');
      });

      await act(async () => {
        resolveRender();
      });

      expect(result.current.isRenderLoading).toBe(false);
      expect(mockOnRunPreview).not.toHaveBeenCalled();
    });

    it('shows loading state while rendering', async () => {
      let resolvePromise!: () => void;
      mockFetchEsqlDatasets.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = () => resolve(noData);
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
