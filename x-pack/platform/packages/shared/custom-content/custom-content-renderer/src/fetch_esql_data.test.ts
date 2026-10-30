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
  getESQLTimeField: jest.fn(),
}));

import type { HttpStart } from '@kbn/core/public';
import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getESQLTimeField } from '@kbn/esql-utils';
import { ESQLVariableType } from '@kbn/esql-types';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { fetchEsqlData } from './fetch_esql_data';

const mockBuildEsQuery = buildEsQuery as jest.MockedFunction<typeof buildEsQuery>;
const mockGetESQLTimeField = getESQLTimeField as jest.MockedFunction<typeof getESQLTimeField>;

const mockHttp = {} as HttpStart;
const mockEsql = jest.fn();
const mockSearch = { esql: mockEsql };
const mockSignal = new AbortController().signal;
const esqlQuery = 'FROM logs | STATS count = COUNT(*)';
const mockResponse = { columns: [], values: [], all_columns: [] };

const emptyBoolQuery = {
  bool: { filter: [], must: [], must_not: [], should: [] },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBuildEsQuery.mockReturnValue(emptyBoolQuery as ReturnType<typeof buildEsQuery>);
  mockEsql.mockResolvedValue({ rawResponse: mockResponse });
  mockGetESQLTimeField.mockResolvedValue(undefined);
});

describe('fetchEsqlData', () => {
  describe('no constraints', () => {
    it('omits the filter from the esql search when no filters, query, or time range', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      expect(mockEsql.mock.calls[0][0]).not.toHaveProperty('filter');
    });

    it('returns the rawResponse from the esql search', async () => {
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

      expect(mockEsql.mock.calls[0][0]).not.toHaveProperty('filter');
    });

    it('merges the time range filter into esBoolQuery.bool.filter', async () => {
      mockGetESQLTimeField.mockResolvedValue('@timestamp');
      const existingFilter = { match_phrase: { 'host.name': 'web-01' } };
      mockBuildEsQuery.mockReturnValue({
        bool: { filter: [existingFilter], must: [], must_not: [], should: [] },
      } as ReturnType<typeof buildEsQuery>);

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, timeRange, mockSignal);

      expect(mockEsql).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: {
            bool: {
              filter: [existingFilter, { range: { '@timestamp': expect.any(Object) } }],
              must: [],
              must_not: [],
              should: [],
            },
          },
        }),
        expect.anything()
      );
    });

    it('produces a bool filter from time range alone when esBoolQuery has no other constraints', async () => {
      mockGetESQLTimeField.mockResolvedValue('@timestamp');

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, timeRange, mockSignal);

      const call = mockEsql.mock.calls[0][0];
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

      expect(mockEsql.mock.calls[0][0]).not.toHaveProperty('filter');
    });
  });

  describe('hasConstraints — filter produced only when needed', () => {
    it('sets filter when must_not is non-empty even if filter array is empty', async () => {
      mockBuildEsQuery.mockReturnValue({
        bool: { filter: [], must: [], must_not: [{ term: { status: 'error' } }], should: [] },
      } as ReturnType<typeof buildEsQuery>);

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      expect(mockEsql).toHaveBeenCalledWith(
        expect.objectContaining({ filter: expect.objectContaining({ bool: expect.any(Object) }) }),
        expect.anything()
      );
    });

    it('sets filter when should is non-empty', async () => {
      mockBuildEsQuery.mockReturnValue({
        bool: { filter: [], must: [], must_not: [], should: [{ term: { env: 'prod' } }] },
      } as ReturnType<typeof buildEsQuery>);

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      expect(mockEsql).toHaveBeenCalledWith(
        expect.objectContaining({ filter: expect.objectContaining({ bool: expect.any(Object) }) }),
        expect.anything()
      );
    });
  });

  describe('esqlVariables passthrough', () => {
    it('leaves esqlVariables undefined in the query context when not provided', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      const call = mockEsql.mock.calls[0][0];
      expect(call.kibanaQueryContext.esqlVariables).toBeUndefined();
    });

    it('forwards esqlVariables to the query context when provided', async () => {
      const esqlVariables = [
        { key: '?threshold', value: 100, type: ESQLVariableType.VALUES },
        { key: '?env', value: 'production', type: ESQLVariableType.VALUES },
      ];

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        esqlVariables,
      });

      expect(mockEsql).toHaveBeenCalledWith(
        expect.objectContaining({
          kibanaQueryContext: expect.objectContaining({ esqlVariables }),
        }),
        expect.anything()
      );
    });
  });

  describe('approximation and projectRouting passthrough', () => {
    it('omits approximation from the esql search when not provided', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      const call = mockEsql.mock.calls[0][0];
      expect(call).not.toHaveProperty('approximation');
    });

    it('forwards isApproximate: true as approximation', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        isApproximate: true,
      });

      expect(mockEsql).toHaveBeenCalledWith(
        expect.objectContaining({ approximation: true }),
        expect.anything()
      );
    });

    it('forwards projectRouting when provided', async () => {
      const projectRouting = 'p-abc123' as import('@kbn/es-query').ProjectRouting;

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        projectRouting,
      });

      expect(mockEsql).toHaveBeenCalledWith(
        expect.objectContaining({ projectRouting }),
        expect.anything()
      );
    });

    it('omits projectRouting from the esql search when not provided', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      const call = mockEsql.mock.calls[0][0];
      expect(call).not.toHaveProperty('projectRouting');
    });
  });

  describe('inspector request adapter', () => {
    it('hands the adapter to the esql search so it records the request', async () => {
      const requestAdapter = new RequestAdapter();

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        requestAdapter,
      });

      expect(mockEsql).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          abortSignal: mockSignal,
          inspector: expect.objectContaining({ adapter: requestAdapter }),
        })
      );
    });

    it('does not pass an inspector without an adapter', async () => {
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal);

      expect(mockEsql.mock.calls[0][1]).not.toHaveProperty('inspector');
    });

    it('resets the adapter before each fetch, so refetches do not pile up', async () => {
      const requestAdapter = new RequestAdapter();
      const resetSpy = jest.spyOn(requestAdapter, 'reset');

      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        requestAdapter,
      });
      await fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
        requestAdapter,
      });

      expect(resetSpy).toHaveBeenCalledTimes(2);
    });

    it('rethrows a failed search', async () => {
      const error = new Error('boom');
      mockEsql.mockRejectedValue(error);

      await expect(
        fetchEsqlData(mockSearch, mockHttp, esqlQuery, undefined, mockSignal, {
          requestAdapter: new RequestAdapter(),
        })
      ).rejects.toBe(error);
    });
  });
});
