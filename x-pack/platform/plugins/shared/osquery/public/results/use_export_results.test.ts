/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useKibana } from '../common/lib/kibana';
import { useExportResults } from './use_export_results';
import type { ExportFormat } from './use_export_results';

jest.mock('../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createMockBlob = () => new Blob(['mock-content'], { type: 'application/ndjson' });

/**
 * Minimal ReadableStream-shaped body that emits one chunk then closes.
 * Sufficient for the streaming-download fallback path in use_export_results.
 */
const createMockBody = () => {
  let emitted = false;

  return {
    getReader: jest.fn().mockReturnValue({
      read: jest.fn().mockImplementation(() => {
        if (emitted) {
          return Promise.resolve({ done: true, value: undefined });
        }

        emitted = true;

        return Promise.resolve({ done: false, value: new Uint8Array([1, 2, 3, 4]) });
      }),
    }),
  };
};

const createMockRawResponse = (
  contentDisposition: string | null = null,
  contentType: string | null = 'application/ndjson'
) => ({
  blob: jest.fn().mockResolvedValue(createMockBlob()),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(4)),
  body: createMockBody(),
  headers: {
    get: jest.fn().mockImplementation((name: string) => {
      if (name.toLowerCase() === 'content-disposition') return contentDisposition;
      if (name.toLowerCase() === 'content-type') return contentType;

      return null;
    }),
  },
});

/**
 * Returns the full useKibana()-shaped object and a mocks ref for assertions.
 * Use: const { kibana, mocks } = createMockServices();
 *      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);
 */
const createMockServices = () => {
  const mockAddInfo = jest.fn().mockReturnValue({ id: 'loading-toast-id' });
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();
  const mockRemoveToast = jest.fn();
  const mockRawResponse = createMockRawResponse();
  const mockFetch = jest.fn().mockResolvedValue({ response: mockRawResponse });

  // useKibana() returns { services: { http, notifications } }
  const kibana = {
    services: {
      http: { fetch: mockFetch },
      notifications: {
        toasts: {
          addInfo: mockAddInfo,
          addSuccess: mockAddSuccess,
          addDanger: mockAddDanger,
          remove: mockRemoveToast,
        },
      },
    },
  };

  return {
    kibana,
    mocks: {
      addInfo: mockAddInfo,
      addSuccess: mockAddSuccess,
      addDanger: mockAddDanger,
      removeToast: mockRemoveToast,
      fetch: mockFetch,
      rawResponse: mockRawResponse,
    },
  };
};

// URL.createObjectURL is installed as non-configurable/non-writable by jest setup (polyfills.jsdom.js).
// URL.revokeObjectURL is absent from jsdom entirely — we install a no-op to avoid runtime errors.
// We verify download behavior through anchor element interaction rather than URL API assertions.
if (typeof URL.revokeObjectURL !== 'function') {
  // Property doesn't exist, so this assignment creates it as writable/configurable (ES default)
  (URL as unknown as Record<string, unknown>).revokeObjectURL = jest.fn();
}

describe('useExportResults', () => {
  let mockAnchorClick: jest.Mock;
  let mockAnchorElement: Partial<HTMLAnchorElement>;
  let mockAppendChild: jest.SpyInstance;
  let mockRemoveChild: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAnchorClick = jest.fn();
    mockAnchorElement = { href: '', download: '', click: mockAnchorClick };

    // Intercept document.createElement only for <a> tags; pass through all others
    const originalCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string, options?: ElementCreationOptions) => {
        if (tag === 'a') return mockAnchorElement as HTMLAnchorElement;

        return originalCreateElement(tag, options);
      });

    mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('endpoint selection', () => {
    it('should call the live query endpoint when isLive is true', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true, liveQueryId: 'live-1' })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        '/api/osquery/live_queries/live-1/results/action-abc/_export',
        expect.anything()
      );
    });

    it('should fall back to actionId as liveQueryId when liveQueryId is missing', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        '/api/osquery/live_queries/action-abc/results/action-abc/_export',
        expect.anything()
      );
    });

    it('should call the live query endpoint when scheduleId is missing', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({
          actionId: 'action-abc',
          isLive: false,
          liveQueryId: 'live-1',
          scheduleId: undefined,
        })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        '/api/osquery/live_queries/live-1/results/action-abc/_export',
        expect.anything()
      );
    });

    it('should call the live query endpoint when executionCount is undefined', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({
          actionId: 'action-abc',
          isLive: false,
          liveQueryId: 'live-1',
          scheduleId: 'sched-1',
          executionCount: undefined,
        })
      );

      await act(async () => {
        await result.current.exportResults('csv');
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        '/api/osquery/live_queries/live-1/results/action-abc/_export',
        expect.anything()
      );
    });

    it('should call the scheduled results endpoint for scheduled queries with executionCount', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({
          actionId: 'action-abc',
          isLive: false,
          scheduleId: 'pack-sched-1',
          executionCount: 7,
        })
      );

      await act(async () => {
        await result.current.exportResults('json');
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        '/api/osquery/scheduled_results/pack-sched-1/7/_export',
        expect.anything()
      );
    });

    it('should use executionCount=0 in scheduled endpoint when count is zero', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({
          actionId: 'action-abc',
          isLive: false,
          scheduleId: 'sched-1',
          executionCount: 0,
        })
      );

      await act(async () => {
        await result.current.exportResults('csv');
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        '/api/osquery/scheduled_results/sched-1/0/_export',
        expect.anything()
      );
    });
  });

  describe('HTTP request parameters', () => {
    it('should pass format as a query parameter', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('csv');
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ query: { format: 'csv' } })
      );
    });

    it('should use POST method', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should request rawResponse and asResponse', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ asResponse: true, rawResponse: true })
      );
    });
  });

  describe('loading toast', () => {
    it('should show a loading toast when export starts', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.addInfo).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('NDJSON') })
      );
    });

    it('should show format in uppercase in loading toast title', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('csv');
      });

      expect(mocks.addInfo).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('CSV') })
      );
    });

    it('should remove loading toast on success', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.removeToast).toHaveBeenCalledWith('loading-toast-id');
    });

    it('should remove loading toast on error', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      mocks.fetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.removeToast).toHaveBeenCalledWith('loading-toast-id');
    });
  });

  describe('file download', () => {
    it('should trigger a file download via anchor click', async () => {
      const { kibana } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      // Anchor must be clicked to trigger browser download
      expect(mockAnchorClick).toHaveBeenCalled();
    });

    it('should use filename from Content-Disposition header when present', async () => {
      const { kibana, mocks } = createMockServices();
      const mockRaw = createMockRawResponse('attachment; filename="custom-file.ndjson"');
      mocks.fetch.mockResolvedValue({ response: mockRaw });
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mockAnchorElement.download).toBe('custom-file.ndjson');
    });

    it('should generate fallback filename using actionId when Content-Disposition is absent', async () => {
      const { kibana } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-xyz', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('csv');
      });

      expect(mockAnchorElement.download).toContain('action-xyz');
      expect(mockAnchorElement.download).toContain('.csv');
    });

    it('should use ndjson extension in fallback filename for ndjson format', async () => {
      const { kibana } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mockAnchorElement.download).toMatch(/ndjson/);
    });

    it('should append anchor to body and remove it after click', async () => {
      const { kibana } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchorElement);
      expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchorElement);
    });

    it('falls back to arrayBuffer() when response.body is missing', async () => {
      const { kibana, mocks } = createMockServices();
      // Some environments (older browsers, certain test runtimes) deliver a
      // Response with no streamable body. The hook must still produce a Blob
      // and trigger the anchor click in that case.
      const mockRaw = {
        ...createMockRawResponse(),
        body: null,
      };
      mocks.fetch.mockResolvedValueOnce({ response: mockRaw });
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mockRaw.arrayBuffer).toHaveBeenCalled();
      expect(mockAnchorClick).toHaveBeenCalled();
    });
  });

  describe('success toast', () => {
    it('should show success toast after successful export', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.addSuccess).toHaveBeenCalledWith(
        expect.stringContaining('exported successfully')
      );
    });
  });

  describe('error handling', () => {
    it('should show danger toast with error body message on generic failure', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      mocks.fetch.mockRejectedValueOnce({
        body: { message: 'Too many results', statusCode: 400 },
      });

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.addDanger).toHaveBeenCalledWith('Too many results');
    });

    it('should surface the server message verbatim on 400 too-many-results error', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      // Server-side guardrail rejects exports above 500k rows with this message shape.
      const tooManyResults =
        'Export limited to 500,000 results. Found 750000. Please add filters to narrow results.';
      mocks.fetch.mockRejectedValueOnce({
        body: { message: tooManyResults, statusCode: 400 },
      });

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.addDanger).toHaveBeenCalledWith(tooManyResults);
      expect(mocks.addDanger).not.toHaveBeenCalledWith(expect.stringContaining('permission'));
    });

    it('should show unauthorized danger toast on 403 error', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      mocks.fetch.mockRejectedValueOnce({
        body: { message: 'Unauthorized', statusCode: 403 },
      });

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.addDanger).toHaveBeenCalledWith(expect.stringContaining('permission'));
    });

    it('should show fallback error message when error has no body.message', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      mocks.fetch.mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.addDanger).toHaveBeenCalledWith(
        expect.stringContaining('Failed to export results')
      );
    });

    it('should not show success toast on error', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      mocks.fetch.mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      expect(mocks.addSuccess).not.toHaveBeenCalled();
    });
  });

  describe('isExporting state', () => {
    it('should set isExporting to true while export is in progress', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      let resolveFetch!: (value: unknown) => void;
      mocks.fetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      expect(result.current.isExporting).toBe(false);

      act(() => {
        result.current.exportResults('ndjson');
      });

      expect(result.current.isExporting).toBe(true);

      // Resolve the pending fetch to allow the hook to finish
      await act(async () => {
        resolveFetch({ response: createMockRawResponse() });
      });
    });

    it('should set isExporting back to false after successful export', async () => {
      const { kibana } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });

    it('should set isExporting back to false after export error', async () => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      mocks.fetch.mockRejectedValueOnce(new Error('Export failed'));

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults('ndjson');
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });
  });

  describe('format variants', () => {
    const formats: ExportFormat[] = ['ndjson', 'json', 'csv'];

    it.each(formats)('should complete export successfully for %s format', async (format) => {
      const { kibana, mocks } = createMockServices();
      useKibanaMock.mockReturnValue(kibana as unknown as ReturnType<typeof useKibana>);

      const { result } = renderHook(() =>
        useExportResults({ actionId: 'action-abc', isLive: true })
      );

      await act(async () => {
        await result.current.exportResults(format);
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ query: { format } })
      );
      expect(mocks.addSuccess).toHaveBeenCalled();
    });
  });
});
