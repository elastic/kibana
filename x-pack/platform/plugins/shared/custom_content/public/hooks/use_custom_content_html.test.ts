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

import type { HttpStart } from '@kbn/core/public';
import { getServices } from '../services';
import { streamGenerate } from '../utils/stream_generate';
import { useCustomContentHtml } from './use_custom_content_html';

const mockHttp = {} as unknown as HttpStart;

beforeEach(() => {
  jest.clearAllMocks();
  (getServices as jest.Mock).mockReturnValue({ core: { http: mockHttp } });
  (streamGenerate as jest.Mock).mockResolvedValue(undefined);
});

const baseParams = {
  embeddableId: 'panel-1',
  prompt: 'Show revenue by category',
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
    it('renders the stored HTML immediately with no server calls', async () => {
      const { result } = renderHook(() =>
        useCustomContentHtml({ ...baseParams, savedTemplate: VALID_HTML })
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.html).toContain('hello');
      expect(streamGenerate).not.toHaveBeenCalled();
    });
  });

  describe('slow path — no stored template, LLM generation', () => {
    it('calls streamGenerate and saves the result via onTemplateChange', async () => {
      const onTemplateChange = jest.fn();
      (streamGenerate as jest.Mock).mockImplementation(
        (_http: unknown, _params: unknown, onToken: (t: string) => void) => {
          onToken(VALID_HTML);
          return Promise.resolve();
        }
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
        (_http: unknown, _params: unknown, onToken: (t: string) => void) => {
          onToken('<html><body><div id="chart"></div><script>doStuff()</script></body></html>');
          return Promise.resolve();
        }
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
