/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { ISearchGeneric } from '@kbn/search-types';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { fetchEsqlData, type EsqlDataResult } from './fetch_esql_data';
import { fetchEsqlDatasets } from './fetch_esql_datasets';

jest.mock('./fetch_esql_data');

const mockFetchEsqlData = fetchEsqlData as jest.MockedFunction<typeof fetchEsqlData>;
const search = jest.fn() as unknown as ISearchGeneric;
const http = {} as HttpStart;
const columns = [{ name: 'n', type: 'long' }];

const response = (overrides: Partial<EsqlDataResult> = {}): EsqlDataResult => ({
  columns,
  values: [[1]],
  all_columns: columns,
  ...overrides,
});

const fetchAll = (queries: string[], signal = new AbortController().signal, options = {}) =>
  fetchEsqlDatasets(search, http, queries, undefined, signal, options);

beforeEach(() => {
  mockFetchEsqlData.mockReset();
  mockFetchEsqlData.mockResolvedValue(response());
});

describe('fetchEsqlDatasets', () => {
  it('fetches every query and returns one dataset per query, in order', async () => {
    mockFetchEsqlData
      .mockResolvedValueOnce(response({ values: [[1]] }))
      .mockResolvedValueOnce(response({ values: undefined }));

    const { datasets } = await fetchAll(['FROM a', 'FROM b']);

    expect(datasets).toEqual([
      { columns, rows: [[1]] },
      { columns, rows: [] },
    ]);
    expect(mockFetchEsqlData.mock.calls.map(([, , query]) => query)).toEqual(['FROM a', 'FROM b']);
  });

  it.each([
    ['approximated when any query is', [false, true], true],
    ['not approximated when every query says so', [false, false], false],
    ['unknown when no query says', [undefined, undefined], undefined],
  ])('reports the approximation as %s', async (_label, flags, expected) => {
    flags.forEach((approximation_applied) =>
      mockFetchEsqlData.mockResolvedValueOnce(response({ approximation_applied }))
    );

    const { approximationApplied } = await fetchAll(['FROM a', 'FROM b']);

    expect(approximationApplied).toBe(expected);
  });

  it('says which query failed when the panel has several, and leaves a single query as it is', async () => {
    mockFetchEsqlData.mockResolvedValueOnce(response()).mockRejectedValueOnce(new Error('bad'));
    await expect(fetchAll(['FROM a', 'FROM b'])).rejects.toThrow('Query 2 failed: bad');

    mockFetchEsqlData.mockRejectedValueOnce(new Error('bad'));
    await expect(fetchAll(['FROM a'])).rejects.toThrow(/^bad$/);
  });

  it('names a query that rejects with something that is not an error', async () => {
    mockFetchEsqlData.mockResolvedValueOnce(response()).mockRejectedValueOnce('boom');

    await expect(fetchAll(['FROM a', 'FROM b'])).rejects.toThrow('Query 2 failed: boom');
  });

  it('ends the other queries when one fails', async () => {
    const signals: AbortSignal[] = [];
    mockFetchEsqlData.mockImplementation(async (_search, _http, query, _range, signal) => {
      signals.push(signal);
      if (query === 'FROM bad') throw new Error('bad');
      return new Promise<EsqlDataResult>(() => {});
    });

    await expect(fetchAll(['FROM slow', 'FROM bad'])).rejects.toThrow('Query 2 failed: bad');

    expect(signals.map(({ aborted }) => aborted)).toEqual([true, true]);
  });

  it('ends every query when the caller aborts, without renaming the abort', async () => {
    const controller = new AbortController();
    mockFetchEsqlData.mockImplementation(
      (_search, _http, _query, _range, signal) =>
        new Promise<EsqlDataResult>((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        })
    );

    const fetched = fetchAll(['FROM a', 'FROM b'], controller.signal);
    controller.abort();

    await expect(fetched).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('titles the requests by query when there are several, and leaves a single one as it is', async () => {
    const titles = () =>
      mockFetchEsqlData.mock.calls.map(([, , , , , options]) => options?.requestTitle);

    await fetchAll(['FROM a', 'FROM b']);
    expect(titles()).toEqual(['Data (query 1)', 'Data (query 2)']);

    mockFetchEsqlData.mockClear();
    await fetchAll(['FROM a']);
    expect(titles()).toEqual([undefined]);
  });

  it('clears the request adapter once, so the queries keep each other entries', async () => {
    const requestAdapter = { reset: jest.fn() } as unknown as RequestAdapter;

    await fetchAll(['FROM a', 'FROM b'], undefined, { requestAdapter });

    expect(requestAdapter.reset).toHaveBeenCalledTimes(1);
    mockFetchEsqlData.mock.calls.forEach(([, , , , , options]) =>
      expect(options).toMatchObject({ requestAdapter, keepRequests: true })
    );
  });
});
