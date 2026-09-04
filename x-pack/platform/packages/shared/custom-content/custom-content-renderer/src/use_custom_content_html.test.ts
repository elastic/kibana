/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { EuiThemeComputed } from '@elastic/eui';

// DOMPurify requires a real DOM — pass-through in Jest
jest.mock('dompurify', () => ({
  __esModule: true,
  default: { sanitize: (html: string) => html },
}));

jest.mock('./fetch_esql_data');
jest.mock('./fill_template');
jest.mock('@kbn/data-service', () => ({
  getEsQueryConfig: jest.fn(),
}));

import type { EuiThemeColorModeStandard } from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import type { EsQueryConfig, Filter, Query, TimeRange } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-service';
import { ESQLVariableType } from '@kbn/esql-types';
import { fetchEsqlData } from './fetch_esql_data';
import { fillTemplate } from './fill_template';
import { useCustomContentHtml } from './use_custom_content_html';
import type { CustomContentRendererServices } from './types';

const mockGetEsQueryConfig = getEsQueryConfig as jest.MockedFunction<typeof getEsQueryConfig>;
const mockFetchEsqlData = fetchEsqlData as jest.MockedFunction<typeof fetchEsqlData>;
const mockFillTemplate = fillTemplate as jest.MockedFunction<typeof fillTemplate>;

const mockHttp = {} as unknown as HttpStart;
const mockSearch = jest.fn();

const defaultEsQueryConfig: EsQueryConfig = {
  allowLeadingWildcards: false,
  queryStringOptions: {},
  ignoreFilterIfFieldNotInIndex: false,
  dateFormatTZ: 'Browser',
};

const mockEuiTheme = {
  colors: {
    textParagraph: '#343741',
    emptyShade: '#FFFFFF',
    lightestShade: '#F5F7FA',
    primary: '#0077CC',
    accentSecondary: '#008B87',
    accent: '#F04E98',
    warning: '#FEC514',
    danger: '#BD271E',
    borderBasePlain: '#D3DAE6',
  },
  size: { xs: '4px', s: '8px', m: '12px', base: '16px', l: '24px' },
  border: { radius: { medium: '6px', small: '4px' } },
  animation: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    resistance: 'cubic-bezier(.32,.72,0,1)',
  },
  font: {
    family: 'Inter, sans-serif',
  },
} as unknown as EuiThemeComputed;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetEsQueryConfig.mockReturnValue(defaultEsQueryConfig);
  mockFetchEsqlData.mockResolvedValue({ columns: [], values: [], all_columns: [] });
  mockFillTemplate.mockResolvedValue('<div>rendered</div>');
});

const mockServices = {
  http: mockHttp,
  uiSettings: {} as CustomContentRendererServices['uiSettings'],
  search: mockSearch as unknown as CustomContentRendererServices['search'],
};

const baseParams: Parameters<typeof useCustomContentHtml>[0] = {
  services: mockServices,
  embeddableId: 'panel-1',
  esqlQuery: undefined,
  timeRange: undefined,
  generationVersion: 0,
  savedTemplate: undefined,
  colorMode: 'LIGHT' as const,
  euiTheme: mockEuiTheme,
  isApproximate: false,
  projectRouting: undefined,
  query: undefined,
  filters: undefined,
  esqlVariables: undefined,
};

const VALID_HTML = `<html><body><p>hello</p></body></html>`;

describe('useCustomContentHtml', () => {
  describe('no template available', () => {
    it('leaves isLoading false and signals noContent when there is no stored template', () => {
      const { result } = renderHook(() => useCustomContentHtml(baseParams));
      expect(result.current.isLoading).toBe(false);
      expect(result.current.html).toBe('');
      expect(result.current.noContent).toBe(true);
    });

    it('treats a whitespace-only template as no content rather than rendering a blank panel', () => {
      const { result } = renderHook(() =>
        useCustomContentHtml({ ...baseParams, savedTemplate: '   \n  ' })
      );
      expect(result.current.noContent).toBe(true);
      expect(result.current.html).toBe('');
    });

    it('does not fetch ES|QL for a whitespace-only template', () => {
      renderHook(() =>
        useCustomContentHtml({
          ...baseParams,
          savedTemplate: '   ',
          esqlQuery: 'FROM logs | LIMIT 10',
        })
      );
      expect(mockFetchEsqlData).not.toHaveBeenCalled();
    });

    it('clears a stale error and html when savedTemplate transitions to undefined', async () => {
      mockFetchEsqlData.mockRejectedValueOnce(new Error('index not found'));

      const { result, rerender } = renderHook(
        ({ savedTemplate }: { savedTemplate: string | undefined }) =>
          useCustomContentHtml({
            ...baseParams,
            esqlQuery: 'FROM logs | LIMIT 10',
            savedTemplate,
          }),
        { initialProps: { savedTemplate: 'hello' as string | undefined } }
      );

      await waitFor(() => expect(result.current.error).toBe('index not found'));

      rerender({ savedTemplate: undefined });

      await waitFor(() => expect(result.current.error).toBeUndefined());
      expect(result.current.html).toBe('');
      expect(result.current.noContent).toBe(true);
    });
  });

  describe('fast path — static panel with stored template', () => {
    it('renders the stored HTML immediately with no fetch calls', async () => {
      const { result } = renderHook(() =>
        useCustomContentHtml({ ...baseParams, savedTemplate: VALID_HTML })
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.html).toContain('hello');
      expect(result.current.noContent).toBe(false);
      expect(mockFetchEsqlData).not.toHaveBeenCalled();
    });
  });

  describe('fast path — ES|QL panel with stored template', () => {
    const esqlParams = {
      ...baseParams,
      esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
      savedTemplate: '{% for row in rows %}{{ row["revenue"].value }}{% endfor %}',
    };

    it('calls fetchEsqlData and fillTemplate', async () => {
      const { result } = renderHook(() => useCustomContentHtml(esqlParams));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchEsqlData).toHaveBeenCalledTimes(1);
      expect(mockFetchEsqlData).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({
          isApproximate: false,
          projectRouting: undefined,
          query: undefined,
          filters: undefined,
        })
      );
      expect(mockFillTemplate).toHaveBeenCalledWith(esqlParams.savedTemplate, [], []);
      expect(result.current.html).toContain('rendered');
      expect(result.current.noContent).toBe(false);
    });

    it('surfaces a fetch error', async () => {
      mockFetchEsqlData.mockRejectedValue(new Error('index not found'));

      const { result } = renderHook(() => useCustomContentHtml(esqlParams));

      await waitFor(() => expect(result.current.error).toBe('index not found'));
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('abort on unmount', () => {
    it('aborts the inflight ES|QL fetch when the hook unmounts', async () => {
      let capturedSignal: AbortSignal | undefined;
      mockFetchEsqlData.mockImplementation((_search, _http, _query, _timeRange, signal) => {
        capturedSignal = signal;
        return new Promise(() => {}); // never resolves
      });

      const esqlParams = {
        ...baseParams,
        esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
        savedTemplate: '{% for row in rows %}{{ row["revenue"].value }}{% endfor %}',
      };

      const { unmount } = renderHook(() => useCustomContentHtml(esqlParams));
      unmount();

      expect(capturedSignal?.aborted).toBe(true);
    });
  });

  describe('timepicker change re-fetches ES|QL panels', () => {
    it('re-calls fetchEsqlData when timeRange changes on a panel with a stored template', async () => {
      const esqlParams = {
        ...baseParams,
        esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
        savedTemplate:
          '<html><body>{% for row in rows %}<p>{{ row["revenue"].value }}</p>{% endfor %}</body></html>',
      };

      const { rerender } = renderHook(
        ({ timeRange }: { timeRange: TimeRange | undefined }) =>
          useCustomContentHtml({ ...esqlParams, timeRange }),
        { initialProps: { timeRange: undefined as TimeRange | undefined } }
      );

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));

      rerender({ timeRange: { from: 'now-7d', to: 'now' } });

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(2));
      expect(mockFetchEsqlData).toHaveBeenLastCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        { from: 'now-7d', to: 'now' },
        expect.any(AbortSignal),
        expect.objectContaining({
          isApproximate: false,
          projectRouting: undefined,
          query: undefined,
          filters: undefined,
        })
      );
    });
  });

  describe('generationVersion refresh', () => {
    it('re-calls fetchEsqlData when generationVersion increments on a panel with a stored template', async () => {
      const esqlParams = {
        ...baseParams,
        esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
        savedTemplate:
          '<html><body>{% for row in rows %}<p>{{ row["revenue"].value }}</p>{% endfor %}</body></html>',
      };

      const { rerender } = renderHook(
        ({ version }: { version: number }) =>
          useCustomContentHtml({ ...esqlParams, generationVersion: version }),
        { initialProps: { version: 0 } }
      );

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));

      rerender({ version: 1 });

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(2));
    });
  });

  describe('theme change does not re-fetch ES|QL', () => {
    it('does not call fetchEsqlData again when only colorMode changes', async () => {
      const esqlParams = {
        ...baseParams,
        esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
        savedTemplate:
          '<html><head></head><body>{% for row in rows %}<p>{{ row["revenue"].value }}</p>{% endfor %}</body></html>',
      };

      const { rerender } = renderHook(
        ({ colorMode }: { colorMode: EuiThemeColorModeStandard }) =>
          useCustomContentHtml({ ...esqlParams, colorMode }),
        { initialProps: { colorMode: 'LIGHT' as EuiThemeColorModeStandard } }
      );

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));

      rerender({ colorMode: 'DARK' });

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));
    });

    it('updates html with new CSS vars when colorMode changes without re-fetching', async () => {
      const esqlParams = {
        ...baseParams,
        savedTemplate: '<html><head></head><body><p>hello</p></body></html>',
      };

      const { result, rerender } = renderHook(
        ({ colorMode }: { colorMode: EuiThemeColorModeStandard }) =>
          useCustomContentHtml({ ...esqlParams, colorMode }),
        { initialProps: { colorMode: 'LIGHT' as EuiThemeColorModeStandard } }
      );

      await waitFor(() => expect(result.current.html).toContain('--cc-color-text'));

      const lightHtml = result.current.html;

      rerender({ colorMode: 'DARK' });

      await waitFor(() => expect(result.current.html).not.toBe(lightHtml));
      expect(result.current.html).toContain('--cc-color-text');
      expect(mockFetchEsqlData).not.toHaveBeenCalled();
    });
  });

  describe('CSS custom properties in rendered html', () => {
    it('injects --cc-color-text and other theme vars into the final html', async () => {
      const { result } = renderHook(() =>
        useCustomContentHtml({
          ...baseParams,
          savedTemplate: '<html><head></head><body><p>hello</p></body></html>',
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.html).toContain('--cc-color-text');
      expect(result.current.html).toContain('--cc-color-background');
      expect(result.current.html).toContain('--cc-color-surface');
    });
  });

  describe('esQueryConfig — uiSettings passthrough via getEsQueryConfig', () => {
    const esqlParams = {
      ...baseParams,
      esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
      savedTemplate: '{% for row in rows %}{{ row["revenue"].value }}{% endfor %}',
    };

    it('forwards the full esQueryConfig from getEsQueryConfig to fetchEsqlData', async () => {
      const customConfig: EsQueryConfig = {
        allowLeadingWildcards: true,
        queryStringOptions: { analyze_wildcard: true },
        ignoreFilterIfFieldNotInIndex: true,
        dateFormatTZ: 'Europe/Athens',
      };
      mockGetEsQueryConfig.mockReturnValue(customConfig);

      const { result } = renderHook(() => useCustomContentHtml(esqlParams));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchEsqlData).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ esQueryConfig: customConfig })
      );
    });
  });

  describe('filters — unified search bar filters', () => {
    const esqlParams = {
      ...baseParams,
      esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
      savedTemplate: '{% for row in rows %}{{ row["revenue"].value }}{% endfor %}',
    };
    const activeFilters = [
      {
        meta: { index: 'logs-*', negate: false },
        query: { match_phrase: { 'host.name': 'prod' } },
      },
    ] satisfies Filter[];

    it('passes filters to fetchEsqlData when provided', async () => {
      const { result } = renderHook(() =>
        useCustomContentHtml({ ...esqlParams, filters: activeFilters })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchEsqlData).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ filters: activeFilters })
      );
    });

    it('re-fetches when filters change', async () => {
      const { rerender } = renderHook(
        ({ filters }: { filters: Filter[] | undefined }) =>
          useCustomContentHtml({ ...esqlParams, filters }),
        { initialProps: { filters: undefined as Filter[] | undefined } }
      );

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));

      rerender({ filters: activeFilters });

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(2));
      expect(mockFetchEsqlData).toHaveBeenLastCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ filters: activeFilters })
      );
    });
  });

  describe('esqlVariables — dashboard ES|QL control variables', () => {
    const esqlParams = {
      ...baseParams,
      esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
      savedTemplate: '{% for row in rows %}{{ row["revenue"].value }}{% endfor %}',
    };
    const variables = [
      { key: '?threshold', value: 100, type: ESQLVariableType.VALUES },
      { key: '?env', value: 'production', type: ESQLVariableType.VALUES },
    ];

    it('passes esqlVariables to fetchEsqlData when provided', async () => {
      const { result } = renderHook(() =>
        useCustomContentHtml({ ...esqlParams, esqlVariables: variables })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchEsqlData).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ esqlVariables: variables })
      );
    });

    it('re-fetches when esqlVariables change', async () => {
      type Vars = typeof variables | undefined;
      const { rerender } = renderHook(
        ({ esqlVariables }: { esqlVariables: Vars }) =>
          useCustomContentHtml({ ...esqlParams, esqlVariables }),
        { initialProps: { esqlVariables: undefined as Vars } }
      );

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));

      rerender({ esqlVariables: variables });

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(2));
      expect(mockFetchEsqlData).toHaveBeenLastCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ esqlVariables: variables })
      );
    });
  });

  describe('projectRouting — project routing context', () => {
    const esqlParams = {
      ...baseParams,
      esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
      savedTemplate: '{% for row in rows %}{{ row["revenue"].value }}{% endfor %}',
    };
    const routing = 'my-project';

    it('passes projectRouting to fetchEsqlData when provided', async () => {
      const { result } = renderHook(() =>
        useCustomContentHtml({ ...esqlParams, projectRouting: routing })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchEsqlData).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ projectRouting: routing })
      );
    });

    it('re-fetches when projectRouting changes', async () => {
      const { rerender } = renderHook(
        ({ projectRouting }: { projectRouting: string | undefined }) =>
          useCustomContentHtml({ ...esqlParams, projectRouting }),
        { initialProps: { projectRouting: undefined as string | undefined } }
      );

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));

      rerender({ projectRouting: routing });

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(2));
      expect(mockFetchEsqlData).toHaveBeenLastCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ projectRouting: routing })
      );
    });
  });

  describe('isApproximate — approximation switch', () => {
    const esqlParams = {
      ...baseParams,
      esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
      savedTemplate: '{% for row in rows %}{{ row["revenue"].value }}{% endfor %}',
    };

    it('passes isApproximate=true to fetchEsqlData when the switch is on', async () => {
      const { result } = renderHook(() =>
        useCustomContentHtml({ ...esqlParams, isApproximate: true })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchEsqlData).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ isApproximate: true })
      );
    });

    it('re-fetches when isApproximate toggles', async () => {
      const { rerender } = renderHook(
        ({ isApproximate }: { isApproximate: boolean }) =>
          useCustomContentHtml({ ...esqlParams, isApproximate }),
        { initialProps: { isApproximate: false } }
      );

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));

      rerender({ isApproximate: true });

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(2));
      expect(mockFetchEsqlData).toHaveBeenLastCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ isApproximate: true })
      );
    });
  });

  describe('query — KQL search bar', () => {
    const esqlParams = {
      ...baseParams,
      esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
      savedTemplate: '{% for row in rows %}{{ row["revenue"].value }}{% endfor %}',
    };
    const kqlQuery: Query = { language: 'kuery', query: 'host.name: prod' };

    it('passes query to fetchEsqlData when provided', async () => {
      const { result } = renderHook(() => useCustomContentHtml({ ...esqlParams, query: kqlQuery }));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchEsqlData).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ query: kqlQuery })
      );
    });

    it('re-fetches when query changes', async () => {
      const { rerender } = renderHook(
        ({ query }: { query: Query | undefined }) => useCustomContentHtml({ ...esqlParams, query }),
        { initialProps: { query: undefined as Query | undefined } }
      );

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));

      rerender({ query: kqlQuery });

      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(2));
      expect(mockFetchEsqlData).toHaveBeenLastCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal),
        expect.objectContaining({ query: kqlQuery })
      );
    });
  });
});
