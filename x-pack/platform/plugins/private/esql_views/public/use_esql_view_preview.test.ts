/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { AggregateQuery } from '@kbn/es-query';
import { formatESQLColumns, getESQLAdHocDataview, getESQLResults } from '@kbn/esql-utils';
import type { EsqlViewPreviewDependencies } from './use_esql_view_preview';
import { useEsqlViewPreview } from './use_esql_view_preview';

jest.mock('@kbn/esql-utils', () => ({
  formatESQLColumns: jest.fn(),
  getESQLAdHocDataview: jest.fn(),
  getESQLResults: jest.fn(),
  prettifyQuery: jest.fn((value: string) => value.replace(/\s+/g, ' ').trim()),
}));

const mockFormatESQLColumns = formatESQLColumns as jest.MockedFunction<typeof formatESQLColumns>;
const mockGetESQLAdHocDataview = getESQLAdHocDataview as jest.MockedFunction<
  typeof getESQLAdHocDataview
>;
const mockGetESQLResults = getESQLResults as jest.MockedFunction<typeof getESQLResults>;

const dataView = { id: 'preview-data-view' };
const dependencies = {
  dataViews: {},
  http: {},
  search: jest.fn(),
} as unknown as EsqlViewPreviewDependencies;

const query = (esql: string): AggregateQuery => ({ esql });

const createResponse = ({
  columns = [{ name: 'message', type: 'keyword' }],
  documentsFound = 5,
  rows = [['hello']],
  took = 12,
} = {}) => ({
  params: {},
  response: {
    columns,
    documents_found: documentsFound,
    took,
    values: rows,
  },
});

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

describe('useEsqlViewPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatESQLColumns.mockReturnValue([
      { id: 'message', name: 'message', meta: { type: 'string' } },
    ]);
    mockGetESQLAdHocDataview.mockResolvedValue(dataView as never);
  });

  it('runs a query and exposes formatted grid data and query stats', async () => {
    mockGetESQLResults.mockResolvedValue(createResponse() as never);
    const { result } = renderHook(() => useEsqlViewPreview(dependencies));

    await act(async () => {
      await result.current.runPreview(query('FROM logs-*'));
    });

    expect(mockGetESQLResults).toHaveBeenCalledWith({
      esqlQuery: 'FROM logs-*',
      includeColumnMetadata: true,
      search: dependencies.search,
      signal: expect.any(AbortSignal),
    });
    expect(mockGetESQLAdHocDataview).toHaveBeenCalledWith({
      dataViewsService: dependencies.dataViews,
      http: dependencies.http,
      options: { allowNoIndex: true, skipFetchFields: true },
      query: 'FROM logs-*',
    });
    expect(result.current.result).toEqual({
      columns: [{ id: 'message', name: 'message', meta: { type: 'string' } }],
      dataView,
      query: { esql: 'FROM logs-*' },
      queryStats: {
        durationInMs: '12ms',
        totalDocumentsProcessed: 5,
      },
      rows: [['hello']],
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('retains an empty successful result', async () => {
    mockGetESQLResults.mockResolvedValue(createResponse({ documentsFound: 0, rows: [] }) as never);
    const { result } = renderHook(() => useEsqlViewPreview(dependencies));

    await act(async () => {
      await result.current.runPreview(query('FROM empty-*'));
    });

    expect(result.current.hasRun).toBe(true);
    expect(result.current.result?.rows).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it('preserves preview results when only query formatting changes', async () => {
    mockGetESQLResults.mockResolvedValue(createResponse() as never);
    const { result } = renderHook(() => useEsqlViewPreview(dependencies));

    await act(async () => {
      await result.current.runPreview(query('FROM logs-* | KEEP message'));
    });

    act(() => {
      result.current.clearPreviewErrorIfQueryChanged('FROM logs-*\n  | KEEP message');
    });

    expect(result.current.hasRun).toBe(true);
    expect(result.current.result?.rows).toEqual([['hello']]);
  });

  it('preserves preview results when the query meaningfully changes', async () => {
    mockGetESQLResults.mockResolvedValue(createResponse() as never);
    const { result } = renderHook(() => useEsqlViewPreview(dependencies));

    await act(async () => {
      await result.current.runPreview(query('FROM logs-* | KEEP message'));
    });

    act(() => {
      result.current.clearPreviewErrorIfQueryChanged('FROM logs-* | KEEP host.name');
    });

    expect(result.current.hasRun).toBe(true);
    expect(result.current.result?.query).toEqual({ esql: 'FROM logs-* | KEEP message' });
    expect(result.current.result?.rows).toEqual([['hello']]);
  });

  it('exposes execution errors without producing a result', async () => {
    mockGetESQLResults.mockRejectedValue(new Error('Invalid query'));
    const { result } = renderHook(() => useEsqlViewPreview(dependencies));

    await act(async () => {
      await result.current.runPreview(query('FROM missing'));
    });

    expect(result.current.error).toEqual(new Error('Invalid query'));
    expect(result.current.result).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('preserves the last successful result when a subsequent query fails', async () => {
    mockGetESQLResults
      .mockResolvedValueOnce(createResponse({ rows: [['existing']] }) as never)
      .mockRejectedValueOnce(new Error('Invalid query'));
    const { result } = renderHook(() => useEsqlViewPreview(dependencies));

    await act(async () => {
      await result.current.runPreview(query('FROM logs-*'));
    });
    await act(async () => {
      await result.current.runPreview(query('FROM missing'));
    });

    expect(result.current.error).toEqual(new Error('Invalid query'));
    expect(result.current.result?.query).toEqual({ esql: 'FROM logs-*' });
    expect(result.current.result?.rows).toEqual([['existing']]);

    act(() => {
      result.current.clearPreviewErrorIfQueryChanged('FROM fixed-*');
    });

    expect(result.current.error).toBeUndefined();
    expect(result.current.result?.rows).toEqual([['existing']]);
  });

  it('keeps the previous result until a replacement query succeeds', async () => {
    const replacementRequest = createDeferred<Awaited<ReturnType<typeof getESQLResults>>>();
    mockGetESQLResults
      .mockResolvedValueOnce(createResponse({ rows: [['existing']] }) as never)
      .mockReturnValueOnce(replacementRequest.promise);
    const { result } = renderHook(() => useEsqlViewPreview(dependencies));

    await act(async () => {
      await result.current.runPreview(query('FROM logs-*'));
    });

    let replacementPromise = Promise.resolve();
    act(() => {
      replacementPromise = result.current.runPreview(query('FROM new-logs-*'));
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.result?.rows).toEqual([['existing']]);

    replacementRequest.resolve(createResponse({ rows: [['replacement']] }) as never);
    await act(async () => {
      await replacementPromise;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.result?.query).toEqual({ esql: 'FROM new-logs-*' });
    expect(result.current.result?.rows).toEqual([['replacement']]);
  });

  it('stops loading when the editor aborts the query', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof getESQLResults>>>();
    mockGetESQLResults.mockReturnValue(deferred.promise);
    const abortController = new AbortController();
    const { result } = renderHook(() => useEsqlViewPreview(dependencies));

    let runPromise = Promise.resolve();
    act(() => {
      runPromise = result.current.runPreview(query('FROM logs-*'), abortController);
    });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      abortController.abort();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasRun).toBe(false);

    deferred.resolve(createResponse() as never);
    await act(async () => {
      await runPromise;
    });
    expect(result.current.result).toBeUndefined();
  });

  it('aborts the active query without clearing existing results when the editor query changes', async () => {
    let requestSignal: AbortSignal | undefined;
    const deferred = createDeferred<Awaited<ReturnType<typeof getESQLResults>>>();
    mockGetESQLResults
      .mockResolvedValueOnce(createResponse({ rows: [['existing']] }) as never)
      .mockImplementationOnce(({ signal }) => {
        requestSignal = signal;
        return deferred.promise;
      });
    const { result } = renderHook(() => useEsqlViewPreview(dependencies));

    await act(async () => {
      await result.current.runPreview(query('FROM logs-*'));
    });

    let runPromise = Promise.resolve();
    act(() => {
      runPromise = result.current.runPreview(query('FROM new-logs-*'));
    });

    act(() => {
      result.current.clearPreviewErrorIfQueryChanged('FROM edited-logs-*');
    });

    expect(requestSignal?.aborted).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasRun).toBe(true);
    expect(result.current.error).toBeUndefined();
    expect(result.current.result?.rows).toEqual([['existing']]);

    deferred.resolve(createResponse({ rows: [['stale']] }) as never);
    await act(async () => {
      await runPromise;
    });
    expect(result.current.result?.rows).toEqual([['existing']]);
  });

  it('aborts the active query when unmounted', async () => {
    let requestSignal: AbortSignal | undefined;
    const deferred = createDeferred<Awaited<ReturnType<typeof getESQLResults>>>();
    mockGetESQLResults.mockImplementation(({ signal }) => {
      requestSignal = signal;
      return deferred.promise;
    });
    const { result, unmount } = renderHook(() => useEsqlViewPreview(dependencies));

    let runPromise = Promise.resolve();
    act(() => {
      runPromise = result.current.runPreview(query('FROM logs-*'));
    });
    unmount();

    expect(requestSignal?.aborted).toBe(true);

    deferred.resolve(createResponse() as never);
    await runPromise;
  });

  it('ignores a stale response after a newer query succeeds', async () => {
    const firstRequest = createDeferred<Awaited<ReturnType<typeof getESQLResults>>>();
    const secondRequest = createDeferred<Awaited<ReturnType<typeof getESQLResults>>>();
    mockGetESQLResults
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const { result } = renderHook(() => useEsqlViewPreview(dependencies));

    let firstRun = Promise.resolve();
    let secondRun = Promise.resolve();
    act(() => {
      firstRun = result.current.runPreview(query('FROM first-*'));
    });
    act(() => {
      secondRun = result.current.runPreview(query('FROM second-*'));
    });

    secondRequest.resolve(createResponse({ rows: [['second']], took: 2 }) as never);
    await act(async () => {
      await secondRun;
    });

    firstRequest.resolve(createResponse({ rows: [['first']], took: 1 }) as never);
    await act(async () => {
      await firstRun;
    });

    expect(result.current.result?.query).toEqual({ esql: 'FROM second-*' });
    expect(result.current.result?.rows).toEqual([['second']]);
  });
});
