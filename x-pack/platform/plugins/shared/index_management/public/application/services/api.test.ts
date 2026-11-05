/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { MAX_INDICES_PER_REQUEST } from '../../../common/constants';
import {
  clearCacheIndices,
  closeIndices,
  deleteIndices,
  fetchIndexDocCounts,
  flushIndices,
  forcemergeIndices,
  openIndices,
  refreshIndices,
  setUiMetricService,
} from './api';
import { esClientService } from './es_client';
import { createEsClientMock } from './es_client.mock';
import { UiMetricService } from './ui_metric';

const setup = () => {
  const http = httpServiceMock.createSetupContract();
  http.fetch.mockResolvedValue({ response: new Response(), body: {} });
  esClientService.setup(createEsClientMock(http));
  return { fetch: http.fetch };
};

beforeAll(() => {
  setUiMetricService(new UiMetricService('index_management_test'));
});

const docCountResponse = (values: Array<[string, number]>) => ({
  response: new Response(),
  body: {
    columns: [
      { name: '_index', type: 'keyword' },
      { name: 'count()', type: 'long' },
    ],
    values,
  },
});

describe('WHEN fetching document counts', () => {
  it('SHOULD send one ES|QL query for all indices that allows partial results', async () => {
    const { fetch } = setup();
    fetch.mockResolvedValue(docCountResponse([]));

    await fetchIndexDocCounts(['logs', 'my "quoted" index']);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      '/internal/es_client/_query',
      expect.objectContaining({
        method: 'POST',
        query: { allow_partial_results: true },
        body: JSON.stringify({
          query: 'FROM "logs","my \\"quoted\\" index" METADATA _index | STATS count() BY _index',
        }),
      })
    );
  });

  it('SHOULD map counts by column name and count indices without documents as 0', async () => {
    const { fetch } = setup();
    fetch.mockResolvedValue(docCountResponse([['logs', 3]]));

    expect(await fetchIndexDocCounts(['logs', 'empty'])).toEqual({ logs: 3, empty: 0 });
  });
});

describe('WHEN running index actions', () => {
  it.each<[string, () => Promise<void>, string, string, object]>([
    ['close', () => closeIndices(['my-index']), 'my-index/_close', 'POST', {}],
    ['open', () => openIndices(['my-index']), 'my-index/_open', 'POST', {}],
    ['delete', () => deleteIndices(['my-index']), 'my-index', 'DELETE', {}],
    ['refresh', () => refreshIndices(['my-index']), 'my-index/_refresh', 'GET', {}],
    ['flush', () => flushIndices(['my-index']), 'my-index/_flush', 'GET', {}],
    [
      'clear the cache of',
      () => clearCacheIndices(['my-index']),
      'my-index/_cache/clear',
      'POST',
      {},
    ],
    ['force merge', () => forcemergeIndices(['my-index'], ''), 'my-index/_forcemerge', 'POST', {}],
    [
      'force merge into a number of segments',
      () => forcemergeIndices(['my-index'], '1'),
      'my-index/_forcemerge',
      'POST',
      { max_num_segments: 1 },
    ],
  ])(
    'SHOULD %s the index without expanding wildcards',
    async (_name, run, esPath, method, query) => {
      const { fetch } = setup();

      await run();

      expect(fetch).toHaveBeenCalledWith(
        `/internal/es_client/${esPath}`,
        expect.objectContaining({ method, query: { expand_wildcards: 'none', ...query } })
      );
    }
  );

  it(`SHOULD send at most ${MAX_INDICES_PER_REQUEST} indices per request`, async () => {
    const { fetch } = setup();
    const indexNames = Array.from({ length: MAX_INDICES_PER_REQUEST + 1 }, (_, i) => `index-${i}`);

    await closeIndices(indexNames);

    const sentIndexNames = fetch.mock.calls.map(([path]) =>
      decodeURIComponent(String(path)).split('/')[3].split(',')
    );
    expect(sentIndexNames.map((names) => names.length)).toEqual([MAX_INDICES_PER_REQUEST, 1]);
    expect(sentIndexNames.flat()).toEqual(indexNames);
  });

  it('SHOULD reject with an error body WHEN the client fails to load', async () => {
    esClientService.setup({
      getClient: () => Promise.reject(new Error('Loading chunk 42 failed')),
    });

    await expect(closeIndices(['my-index'])).rejects.toMatchObject({
      name: 'EsRequestError',
      body: { error: 'Error', message: 'Loading chunk 42 failed' },
    });
  });

  it('SHOULD reject with an error body WHEN the request gets no response', async () => {
    const { fetch } = setup();
    fetch.mockRejectedValue(
      Object.assign(new Error('Failed to fetch'), { name: 'HttpFetchError', request: {} })
    );

    await expect(closeIndices(['my-index'])).rejects.toMatchObject({
      name: 'EsRequestError',
      body: { message: 'Failed to fetch' },
    });
  });

  it('SHOULD reject with the abort error WHEN the request is aborted', async () => {
    const { fetch } = setup();
    fetch.mockRejectedValue(
      Object.assign(new Error('Request was aborted'), { name: 'AbortError', request: {} })
    );

    await expect(closeIndices(['my-index'])).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('SHOULD reject with the Elasticsearch error WHEN the action fails', async () => {
    const { fetch } = setup();
    fetch.mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        name: 'HttpFetchError',
        request: {},
        response: new Response(null, { status: 403, statusText: 'Forbidden' }),
        body: { error: { type: 'security_exception', reason: 'action is unauthorized' } },
      })
    );

    await expect(closeIndices(['my-index'])).rejects.toMatchObject({
      name: 'EsRequestError',
      status: 403,
      body: { statusCode: 403, message: 'action is unauthorized' },
    });
  });
});
