/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

// DOMPurify requires a real DOM — pass-through in Jest
jest.mock('dompurify', () => ({
  __esModule: true,
  default: { sanitize: (html: string) => html },
}));

jest.mock('../services');
jest.mock('../utils/fetch_esql_data');
jest.mock('../utils/fill_template');

import type { EuiThemeColorModeStandard } from '@elastic/eui';
import type { HttpStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import { getServices } from '../services';
import { fetchEsqlData } from '../utils/fetch_esql_data';
import { fillTemplate } from '../utils/fill_template';
import { useCustomContentHtml } from './use_custom_content_html';

const mockFetchEsqlData = fetchEsqlData as jest.MockedFunction<typeof fetchEsqlData>;
const mockFillTemplate = fillTemplate as jest.MockedFunction<typeof fillTemplate>;

const mockHttp = {} as unknown as HttpStart;
const mockSearch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getServices as jest.Mock).mockReturnValue({ core: { http: mockHttp }, search: mockSearch });
  mockFetchEsqlData.mockResolvedValue({ columns: [], values: [], all_columns: [] });
  mockFillTemplate.mockResolvedValue('<div>rendered</div>');
});

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
} as any;

const baseParams: Parameters<typeof useCustomContentHtml>[0] = {
  embeddableId: 'panel-1',
  esqlQuery: undefined,
  timeRange: undefined,
  generationVersion: 0,
  savedTemplate: undefined,
  colorMode: 'LIGHT' as const,
  euiTheme: mockEuiTheme,
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

    it('calls fetchEsqlData and fillTemplate without calling the LLM', async () => {
      const { result } = renderHook(() => useCustomContentHtml(esqlParams));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetchEsqlData).toHaveBeenCalledTimes(1);
      expect(mockFetchEsqlData).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal)
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
        expect.any(AbortSignal)
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

      // Give the effect a chance to run if it incorrectly re-triggered
      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));
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
      // No additional fetch happened
      expect(mockFetchEsqlData).not.toHaveBeenCalled();
    });
  });
});
