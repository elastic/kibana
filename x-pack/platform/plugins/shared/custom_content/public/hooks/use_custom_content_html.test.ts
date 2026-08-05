/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// DOMPurify requires a real DOM — pass-through in Jest
jest.mock('dompurify', () => ({
  __esModule: true,
  default: { sanitize: (html: string) => html },
}));

jest.mock('../services');
jest.mock('../utils/stream_generate');
jest.mock('../utils/fetch_esql_data');
jest.mock('../utils/fill_template');

import type { HttpStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { CustomContentTokenEvent } from '../../common/types';
import { getServices } from '../services';
import { streamGenerate } from '../utils/stream_generate';
import { fetchEsqlData } from '../utils/fetch_esql_data';
import { fillTemplate } from '../utils/fill_template';
import { useCustomContentHtml } from './use_custom_content_html';

const mockFetchEsqlData = fetchEsqlData as jest.MockedFunction<typeof fetchEsqlData>;
const mockFillTemplate = fillTemplate as jest.MockedFunction<typeof fillTemplate>;

const mockHttp = {} as unknown as HttpStart;
const mockSearch = jest.fn();

function makeHttp(events: CustomContentTokenEvent[]) {
  return (_http: unknown, _params: unknown, onToken: (t: string) => void) => {
    events.forEach((e) => {
      if (e.type === 'token' && e.token) onToken(e.token as string);
    });
    return Promise.resolve();
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (getServices as jest.Mock).mockReturnValue({ core: { http: mockHttp }, search: mockSearch });
  (streamGenerate as jest.Mock).mockResolvedValue(undefined);
  mockFetchEsqlData.mockResolvedValue({ columns: [], values: [], all_columns: [] });
  mockFillTemplate.mockResolvedValue('<div>rendered</div>');
});

const baseParams: Parameters<typeof useCustomContentHtml>[0] = {
  embeddableId: 'panel-1',
  prompt: 'Show revenue by category',
  esqlQuery: undefined,
  timeRange: undefined,
  generationVersion: 0,
  savedTemplate: undefined,
  colorMode: 'LIGHT' as const,
  onTemplateChange: jest.fn(),
};

const VALID_HTML = `<html><body><p>hello</p></body></html>`;

describe('useCustomContentHtml', () => {
  describe('empty prompt', () => {
    it('clears isLoading immediately when prompt is empty', () => {
      const { result } = renderHook(() => useCustomContentHtml({ ...baseParams, prompt: '' }));
      expect(result.current.isLoading).toBe(false);
      expect(streamGenerate).not.toHaveBeenCalled();
    });
  });

  describe('fast path — static panel with stored template', () => {
    it('renders the stored HTML immediately with no fetch calls', async () => {
      const { result } = renderHook(() =>
        useCustomContentHtml({ ...baseParams, savedTemplate: VALID_HTML })
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.html).toContain('hello');
      expect(streamGenerate).not.toHaveBeenCalled();
      expect(mockFetchEsqlData).not.toHaveBeenCalled();
    });
  });

  describe('slow path — no stored template, LLM generation', () => {
    it('calls streamGenerate and saves the result via onTemplateChange', async () => {
      const onTemplateChange = jest.fn();
      (streamGenerate as jest.Mock).mockImplementation(
        makeHttp([{ type: 'token', token: VALID_HTML }])
      );

      const { result } = renderHook(() =>
        useCustomContentHtml({ ...baseParams, onTemplateChange })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(streamGenerate).toHaveBeenCalledTimes(1);
      expect(onTemplateChange).toHaveBeenCalledWith(expect.stringContaining('hello'));
      expect(result.current.html).toContain('hello');
    });

    it('surfaces LLM error', async () => {
      (streamGenerate as jest.Mock).mockRejectedValue(new Error('LLM unavailable'));

      const { result } = renderHook(() => useCustomContentHtml({ ...baseParams }));

      await waitFor(() => expect(result.current.error).toBe('LLM unavailable'));
      expect(result.current.isLoading).toBe(false);
    });

    it('shows a script-not-supported error instead of silently rendering blank', async () => {
      (streamGenerate as jest.Mock).mockImplementation(
        makeHttp([
          {
            type: 'token',
            token: '<html><body><div id="chart"></div><script>doStuff()</script></body></html>',
          },
        ])
      );

      const { result } = renderHook(() => useCustomContentHtml({ ...baseParams }));

      await waitFor(() => expect(result.current.error).toMatch(/javascript/i));
      expect(result.current.html).toBe('');
    });

    it('sets isAiUnavailable when the error carries code no_connector', async () => {
      const err = Object.assign(new Error('No inference connector configured'), {
        code: 'no_connector',
      });
      (streamGenerate as jest.Mock).mockRejectedValue(err);

      const { result } = renderHook(() => useCustomContentHtml({ ...baseParams }));

      await waitFor(() => expect(result.current.isAiUnavailable).toBe(true));
      expect(result.current.isLoading).toBe(false);
    });

    it('clears isAiUnavailable when a subsequent generation succeeds', async () => {
      const noConnectorErr = Object.assign(new Error('No inference connector configured'), {
        code: 'no_connector',
      });
      (streamGenerate as jest.Mock).mockRejectedValueOnce(noConnectorErr);

      const { result, rerender } = renderHook(
        ({ version }: { version: number }) =>
          useCustomContentHtml({ ...baseParams, generationVersion: version }),
        { initialProps: { version: 0 } }
      );

      await waitFor(() => expect(result.current.isAiUnavailable).toBe(true));

      (streamGenerate as jest.Mock).mockResolvedValueOnce(undefined);
      rerender({ version: 1 });

      await waitFor(() => expect(result.current.isAiUnavailable).toBe(false));
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
      expect(streamGenerate).not.toHaveBeenCalled();
    });

    it('surfaces a fetch error without calling the LLM', async () => {
      mockFetchEsqlData.mockRejectedValue(new Error('index not found'));

      const { result } = renderHook(() => useCustomContentHtml(esqlParams));

      await waitFor(() => expect(result.current.error).toBe('index not found'));
      expect(result.current.isLoading).toBe(false);
      expect(streamGenerate).not.toHaveBeenCalled();
    });
  });

  describe('slow path — ES|QL panel, LLM then client-side render', () => {
    const LIQUID_TEMPLATE =
      '<html><body>{% for row in rows %}{{ row["revenue"].value }}{% endfor %}</body></html>';
    const esqlParams = {
      ...baseParams,
      esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
    };

    it('calls streamGenerate then fetchEsqlData + fillTemplate, saves the Liquid template', async () => {
      const onTemplateChange = jest.fn();
      (streamGenerate as jest.Mock).mockImplementation(
        makeHttp([{ type: 'token', token: LIQUID_TEMPLATE }])
      );

      const { result } = renderHook(() =>
        useCustomContentHtml({ ...esqlParams, onTemplateChange })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(streamGenerate).toHaveBeenCalledTimes(1);
      expect(mockFetchEsqlData).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        undefined,
        expect.any(AbortSignal)
      );
      expect(mockFillTemplate).toHaveBeenCalledWith(LIQUID_TEMPLATE, [], []);
      expect(result.current.html).toContain('rendered');
      expect(onTemplateChange).toHaveBeenCalledWith(LIQUID_TEMPLATE);
    });

    it('passes timeRange to streamGenerate and fetchEsqlData', async () => {
      const timeRange = { from: 'now-7d', to: 'now' };
      (streamGenerate as jest.Mock).mockImplementation(
        makeHttp([{ type: 'token', token: LIQUID_TEMPLATE }])
      );

      renderHook(() => useCustomContentHtml({ ...esqlParams, timeRange }));

      await waitFor(() => expect(streamGenerate).toHaveBeenCalledTimes(1));
      expect(streamGenerate).toHaveBeenCalledWith(
        mockHttp,
        expect.objectContaining({ esqlQuery: esqlParams.esqlQuery, timeRange }),
        expect.any(Function),
        expect.any(AbortSignal)
      );
      await waitFor(() => expect(mockFetchEsqlData).toHaveBeenCalledTimes(1));
      expect(mockFetchEsqlData).toHaveBeenCalledWith(
        mockSearch,
        mockHttp,
        esqlParams.esqlQuery,
        timeRange,
        expect.any(AbortSignal)
      );
    });

    it('surfaces a render error and does not save the template', async () => {
      (streamGenerate as jest.Mock).mockImplementation(
        makeHttp([{ type: 'token', token: LIQUID_TEMPLATE }])
      );
      mockFetchEsqlData.mockRejectedValue(new Error('query failed'));
      const onTemplateChange = jest.fn();

      const { result } = renderHook(() =>
        useCustomContentHtml({ ...esqlParams, onTemplateChange })
      );

      await waitFor(() => expect(result.current.error).toBeDefined());
      expect(result.current.isLoading).toBe(false);
      expect(onTemplateChange).not.toHaveBeenCalled();
      expect(streamGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry logic', () => {
    it('retries once when static LLM output contains a script tag, succeeds on second attempt', async () => {
      const SCRIPT_HTML = '<html><body><script>bad()</script></body></html>';
      const VALID_HTML_RETRY = '<html><body><p>fixed</p></body></html>';
      (streamGenerate as jest.Mock)
        .mockImplementationOnce(makeHttp([{ type: 'token', token: SCRIPT_HTML }]))
        .mockImplementation(makeHttp([{ type: 'token', token: VALID_HTML_RETRY }]));

      const onTemplateChange = jest.fn();
      const { result } = renderHook(() =>
        useCustomContentHtml({ ...baseParams, onTemplateChange })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(streamGenerate).toHaveBeenCalledTimes(2);
      expect(result.current.error).toBeUndefined();
      expect(result.current.html).toContain('fixed');
      expect(onTemplateChange).toHaveBeenCalledTimes(1);
    });

    it('retries once when ES|QL LLM output is invalid HTML, succeeds on second attempt', async () => {
      const LIQUID_TEMPLATE =
        '<html><body>{% for row in rows %}<p>{{ row["revenue"].value }}</p>{% endfor %}</body></html>';
      (streamGenerate as jest.Mock)
        .mockImplementationOnce(makeHttp([{ type: 'token', token: 'just text, no tags' }]))
        .mockImplementation(makeHttp([{ type: 'token', token: LIQUID_TEMPLATE }]));

      const onTemplateChange = jest.fn();
      const { result } = renderHook(() =>
        useCustomContentHtml({
          ...baseParams,
          esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
          onTemplateChange,
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(streamGenerate).toHaveBeenCalledTimes(2);
      expect(result.current.error).toBeUndefined();
      expect(result.current.html).toContain('rendered');
      expect(onTemplateChange).toHaveBeenCalledWith(LIQUID_TEMPLATE);
    });
  });

  describe('abort on unmount', () => {
    it('aborts the inflight request when the hook unmounts', async () => {
      let capturedSignal: AbortSignal | undefined;
      (streamGenerate as jest.Mock).mockImplementation(
        (_http: unknown, _params: unknown, _onToken: unknown, signal: AbortSignal) => {
          capturedSignal = signal;
          return new Promise(() => {}); // never resolves
        }
      );

      const { unmount } = renderHook(() => useCustomContentHtml({ ...baseParams }));

      await act(async () => {});
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

  describe('refresh re-fetches ES|QL panels after first generation', () => {
    it('re-calls fetchEsqlData when generationVersion increments on a panel with a stored template', async () => {
      const LIQUID_TEMPLATE =
        '<html><body>{% for row in rows %}<p>{{ row["revenue"].value }}</p>{% endfor %}</body></html>';
      const esqlParams = {
        ...baseParams,
        esqlQuery: 'FROM logs | STATS revenue = SUM(amount)',
        savedTemplate: LIQUID_TEMPLATE,
        // simulate selfWrittenRef by having savedTemplate already match what the LLM would write
        prompt: undefined,
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

  describe('re-render on generationVersion change', () => {
    it('re-runs LLM generation when generationVersion increments', async () => {
      (streamGenerate as jest.Mock).mockResolvedValue(undefined);

      const { rerender } = renderHook(
        ({ version }: { version: number }) =>
          useCustomContentHtml({
            ...baseParams,
            generationVersion: version,
          }),
        { initialProps: { version: 0 } }
      );

      await waitFor(() => expect(streamGenerate).toHaveBeenCalledTimes(1));

      rerender({ version: 1 });
      await waitFor(() => expect(streamGenerate).toHaveBeenCalledTimes(2));
    });
  });
});
