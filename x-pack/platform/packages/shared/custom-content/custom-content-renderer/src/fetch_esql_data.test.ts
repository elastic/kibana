/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/datemath', () => ({
  __esModule: true,
  default: {
    parse: jest.fn((val: string, opts?: { roundUp?: boolean }) => ({
      toISOString: () => (opts?.roundUp ? '2024-01-08T00:00:00.000Z' : '2024-01-01T00:00:00.000Z'),
    })),
  },
}));

jest.mock('@kbn/es-query', () => ({
  buildEsQuery: jest.fn(),
}));

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLResults: jest.fn(),
  getESQLTimeField: jest.fn(),
}));

import type { HttpStart } from '@kbn/core/public';
import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getESQLResults, getESQLTimeField } from '@kbn/esql-utils';
import { ESQLVariableType } from '@kbn/esql-types';
import { RequestAdapter, RequestStatus } from '@kbn/inspector-plugin/common';
import { fetchEsqlData } from './fetch_esql_data';

const mockBuildEsQuery = buildEsQuery as jest.MockedFunction<typeof buildEsQuery>;
const mockGetESQLResults = getESQLResults as jest.MockedFunction<typeof getESQLResults>;
const mockGetESQLTimeField = getESQLTimeField as jest.MockedFunction<typeof getESQLTimeField>;

const mockHttp = {} as HttpStart;
const mockSearch = jest.fn();
const mockSignal = new AbortController().signal;
const esqlQuery = 'FROM logs | STATS count = COUNT(*)';
const mockResponse = { columns: [], values: [], all_columns: [] };

const emptyBoolQuery = {
  bool: { filter: [], must: [], must_not: [], should: [] },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBuildEsQuery.mockReturnValue(emptyBoolQuery as ReturnType<typeof buildEsQuery>);
  mockGetESQLResults.mockResolvedValue({
    response: mockResponse,
    params: { query: esqlQuery },
  } as Awaited<ReturnType<typeof getESQLResults>>);
  mockGetESQLTimeField.mockResolvedValue(undefined);
});

describe('fetchEsqlData', () => {
  describe('no constraints', () => {
    it('passes filter: undefined to getESQLResults when no filters, query, or time range', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      expect(mockGetESQLResults).toHaveBeenCalledWith(
        expect.objectContaining({ filter: undefined })
      );
    });

    it('returns the response from getESQLResults', async () => {
      const result = await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);
      expect(result).toBe(mockResponse);
    });
  });

  describe('buildEsQuery args', () => {
    it('calls buildEsQuery with empty arrays when query and filters are undefined', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      expect(mockBuildEsQuery).toHaveBeenCalledWith(undefined, [], [], undefined);
    });

    it('passes query array to buildEsQuery when query is provided', async () => {
      const kqlQuery: Query = { language: 'kuery', query: 'host.name: "web-01"' };

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        query: kqlQuery,
      });

      expect(mockBuildEsQuery).toHaveBeenCalledWith(undefined, kqlQuery, [], undefined);
    });

    it('passes filters array to buildEsQuery when filters are provided', async () => {
      const filters: Filter[] = [
        {
          meta: { index: 'logs-*', alias: null, disabled: false, negate: false },
          query: { match_phrase: { 'host.name': 'web-01' } },
        } satisfies Filter,
      ];

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, { filters });

      expect(mockBuildEsQuery).toHaveBeenCalledWith(undefined, [], filters, undefined);
    });

    it('passes undefined esQueryConfig to buildEsQuery when not provided', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      expect(mockBuildEsQuery).toHaveBeenCalledWith(undefined, [], [], undefined);
    });

    it('forwards esQueryConfig from options to buildEsQuery', async () => {
      const esQueryConfig = {
        allowLeadingWildcards: true,
        queryStringOptions: { analyze_wildcard: true },
        ignoreFilterIfFieldNotInIndex: true,
        dateFormatTZ: 'Europe/Athens',
      };

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        esQueryConfig,
      });

      expect(mockBuildEsQuery).toHaveBeenCalledWith(undefined, [], [], esQueryConfig);
    });
  });

  describe('time range', () => {
    const timeRange = { from: 'now-7d', to: 'now' };

    it('skips the time filter when getESQLTimeField returns undefined', async () => {
      mockGetESQLTimeField.mockResolvedValue(undefined);

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, timeRange, mockSignal);

      expect(mockGetESQLResults).toHaveBeenCalledWith(
        expect.objectContaining({ filter: undefined })
      );
    });

    it('merges the time range filter into esBoolQuery.bool.filter', async () => {
      mockGetESQLTimeField.mockResolvedValue('@timestamp');
      const existingFilter = { match_phrase: { 'host.name': 'web-01' } };
      mockBuildEsQuery.mockReturnValue({
        bool: { filter: [existingFilter], must: [], must_not: [], should: [] },
      } as ReturnType<typeof buildEsQuery>);

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, timeRange, mockSignal);

      expect(mockGetESQLResults).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: {
            bool: {
              filter: [existingFilter, { range: { '@timestamp': expect.any(Object) } }],
              must: [],
              must_not: [],
              should: [],
            },
          },
        })
      );
    });

    it('produces a bool filter from time range alone when esBoolQuery has no other constraints', async () => {
      mockGetESQLTimeField.mockResolvedValue('@timestamp');

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, timeRange, mockSignal);

      const call = mockGetESQLResults.mock.calls[0][0];
      const filter = call.filter as { bool: { filter: unknown[] } };
      expect(filter).toBeDefined();
      expect(filter.bool.filter).toHaveLength(1);
      expect(filter.bool.filter[0]).toMatchObject({
        range: { '@timestamp': { format: 'strict_date_optional_time' } },
      });
    });

    it('silently skips the time filter when getESQLTimeField throws', async () => {
      mockGetESQLTimeField.mockRejectedValue(new Error('field caps unavailable'));

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, timeRange, mockSignal);

      expect(mockGetESQLResults).toHaveBeenCalledWith(
        expect.objectContaining({ filter: undefined })
      );
    });
  });

  describe('hasConstraints — filter produced only when needed', () => {
    it('sets filter when must_not is non-empty even if filter array is empty', async () => {
      mockBuildEsQuery.mockReturnValue({
        bool: { filter: [], must: [], must_not: [{ term: { status: 'error' } }], should: [] },
      } as ReturnType<typeof buildEsQuery>);

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      expect(mockGetESQLResults).toHaveBeenCalledWith(
        expect.objectContaining({ filter: expect.objectContaining({ bool: expect.any(Object) }) })
      );
    });

    it('sets filter when should is non-empty', async () => {
      mockBuildEsQuery.mockReturnValue({
        bool: { filter: [], must: [], must_not: [], should: [{ term: { env: 'prod' } }] },
      } as ReturnType<typeof buildEsQuery>);

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      expect(mockGetESQLResults).toHaveBeenCalledWith(
        expect.objectContaining({ filter: expect.objectContaining({ bool: expect.any(Object) }) })
      );
    });
  });

  describe('esqlVariables passthrough', () => {
    it('omits variables from getESQLResults when not provided', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      const call = mockGetESQLResults.mock.calls[0][0];
      expect(call).not.toHaveProperty('variables');
    });

    it('omits variables from getESQLResults when an empty array is provided', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        esqlVariables: [],
      });

      const call = mockGetESQLResults.mock.calls[0][0];
      expect(call).not.toHaveProperty('variables');
    });

    it('forwards esqlVariables to getESQLResults as variables when provided', async () => {
      const esqlVariables = [
        { key: '?threshold', value: 100, type: ESQLVariableType.VALUES },
        { key: '?env', value: 'production', type: ESQLVariableType.VALUES },
      ];

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        esqlVariables,
      });

      expect(mockGetESQLResults).toHaveBeenCalledWith(
        expect.objectContaining({ variables: esqlVariables })
      );
    });
  });

  describe('approximation and projectRouting passthrough', () => {
    it('omits approximation from getESQLResults when not provided', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      const call = mockGetESQLResults.mock.calls[0][0];
      expect(call).not.toHaveProperty('approximation');
    });

    it('forwards isApproximate: true to getESQLResults as approximation', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        isApproximate: true,
      });

      expect(mockGetESQLResults).toHaveBeenCalledWith(
        expect.objectContaining({ approximation: true })
      );
    });

    it('forwards projectRouting when provided', async () => {
      const projectRouting = 'p-abc123' as import('@kbn/es-query').ProjectRouting;

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        projectRouting,
      });

      expect(mockGetESQLResults).toHaveBeenCalledWith(expect.objectContaining({ projectRouting }));
    });

    it('omits projectRouting from getESQLResults when not provided', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      const call = mockGetESQLResults.mock.calls[0][0];
      expect(call).not.toHaveProperty('projectRouting');
    });
  });

  describe('inspector request adapter', () => {
    it('records a successful request with its hits, body and response', async () => {
      const requestAdapter = new RequestAdapter();
      const connectionParams = { method: 'POST', path: '/_query/async' };
      mockGetESQLResults.mockResolvedValue({
        response: { columns: [], values: [[1], [2]], all_columns: [], took: 12 },
        params: connectionParams,
      } as unknown as Awaited<ReturnType<typeof getESQLResults>>);

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        requestAdapter,
      });

      const [request] = requestAdapter.getRequests();
      expect(requestAdapter.getRequests()).toHaveLength(1);
      expect(request.status).toBe(RequestStatus.OK);
      expect(request.json).toEqual({ query: esqlQuery });
      expect(request.stats?.hits.value).toBe('2');
      expect(request.stats?.queryTime.value).toBe('12ms');
      expect(request.response?.json).toEqual({
        rawResponse: expect.objectContaining({ took: 12 }),
      });
      expect(request.response?.requestParams).toEqual(connectionParams);
    });

    it('shows the filters and the time range filter that were sent in the request body', async () => {
      const requestAdapter = new RequestAdapter();
      const matchPhrase = { match_phrase: { 'host.name': 'web-01' } };
      mockBuildEsQuery.mockReturnValue({
        bool: { filter: [matchPhrase], must: [], must_not: [], should: [] },
      } as ReturnType<typeof buildEsQuery>);
      mockGetESQLTimeField.mockResolvedValue('@timestamp');

      await fetchEsqlData(
        mockSearch,
        mockHttp,
        esqlQuery,
        { from: 'now-7d', to: 'now' },
        mockSignal,
        { requestAdapter }
      );

      expect(requestAdapter.getRequests()[0].json).toEqual({
        query: esqlQuery,
        filter: {
          bool: expect.objectContaining({
            filter: [
              matchPhrase,
              {
                range: {
                  '@timestamp': {
                    gte: '2024-01-01T00:00:00.000Z',
                    lt: '2024-01-08T00:00:00.000Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          }),
        },
      });
    });

    it('omits the query time when Elasticsearch did not report one', async () => {
      const requestAdapter = new RequestAdapter();

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        requestAdapter,
      });

      expect(requestAdapter.getRequests()[0].stats).not.toHaveProperty('queryTime');
    });

    it('keeps only the latest request, so refetches do not pile up', async () => {
      const requestAdapter = new RequestAdapter();

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        requestAdapter,
      });
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        requestAdapter,
      });

      expect(requestAdapter.getRequests()).toHaveLength(1);
    });

    it('shows the request body built from the same parameters getESQLResults sends', async () => {
      const requestAdapter = new RequestAdapter();
      const variables = [{ key: 'host', value: 'a', type: ESQLVariableType.VALUES }];
      const query = 'FROM logs | WHERE host == ?host';

      await fetchEsqlData(mockSearch, mockHttp, query, undefined, mockSignal, {
        requestAdapter,
        esqlVariables: variables,
        isApproximate: true,
        projectRouting: 'my-project' as import('@kbn/es-query').ProjectRouting,
      });

      expect(requestAdapter.getRequests()[0].json).toEqual({
        query,
        params: [{ host: 'a' }],
        approximation: true,
        project_routing: 'my-project',
      });
    });

    it('records a failed request with the error attributes and rethrows', async () => {
      const requestAdapter = new RequestAdapter();
      const error = Object.assign(new Error('boom'), { attributes: { type: 'parsing_exception' } });
      mockGetESQLResults.mockRejectedValue(error);

      await expect(
        fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, { requestAdapter })
      ).rejects.toBe(error);

      const [request] = requestAdapter.getRequests();
      expect(request.status).toBe(RequestStatus.ERROR);
      expect(request.json).toMatchObject({ query: esqlQuery });
      expect(request.response?.json).toEqual({ type: 'parsing_exception' });
    });

    it('falls back to the error message when the error has no attributes', async () => {
      const requestAdapter = new RequestAdapter();
      mockGetESQLResults.mockRejectedValue(new Error('network down'));

      await expect(
        fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, { requestAdapter })
      ).rejects.toThrow('network down');

      expect(requestAdapter.getRequests()[0].response?.json).toEqual({
        message: 'network down',
      });
    });

    it('records the message of a thrown value that is not an Error', async () => {
      const requestAdapter = new RequestAdapter();
      mockGetESQLResults.mockRejectedValue('plain string failure');

      await expect(
        fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, { requestAdapter })
      ).rejects.toBe('plain string failure');

      expect(requestAdapter.getRequests()[0].response?.json).toEqual({
        message: 'plain string failure',
      });
    });

    it('ignores error attributes that are not an object', async () => {
      const requestAdapter = new RequestAdapter();
      mockGetESQLResults.mockRejectedValue(
        Object.assign(new Error('bad attributes'), { attributes: null })
      );

      await expect(
        fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, { requestAdapter })
      ).rejects.toThrow('bad attributes');

      expect(requestAdapter.getRequests()[0].response?.json).toEqual({
        message: 'bad attributes',
      });
    });

    it('does not record a request that was aborted by a newer fetch', async () => {
      const requestAdapter = new RequestAdapter();
      const controller = new AbortController();
      controller.abort();
      mockGetESQLResults.mockRejectedValue(new DOMException('aborted', 'AbortError'));

      await expect(
        fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, controller.signal, {
          requestAdapter,
        })
      ).rejects.toThrow();

      expect(requestAdapter.getRequests()).toHaveLength(0);
    });

    it('does not record a response that arrives after the fetch was superseded', async () => {
      const requestAdapter = new RequestAdapter();
      const controller = new AbortController();
      mockGetESQLResults.mockImplementation(async () => {
        controller.abort();
        return {
          response: mockResponse,
          params: { query: esqlQuery },
        } as Awaited<ReturnType<typeof getESQLResults>>;
      });

      const result = await fetchEsqlData(
        mockSearch,
        mockHttp,
        esqlQuery,
        undefined,
        controller.signal,
        { requestAdapter }
      );

      expect(result).toBe(mockResponse);
      expect(requestAdapter.getRequests()).toHaveLength(0);
    });

    it('works without an adapter and returns the same response', async () => {
      const result = await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      expect(result).toBe(mockResponse);
    });
  });
});
