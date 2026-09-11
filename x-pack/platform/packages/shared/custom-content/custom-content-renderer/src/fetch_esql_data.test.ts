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
  getESQLResults: jest.fn(),
  getESQLTimeField: jest.fn(),
}));

import type { HttpStart } from '@kbn/core/public';
import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getESQLResults, getESQLTimeField } from '@kbn/esql-utils';
import { ESQLVariableType } from '@kbn/esql-types';
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
});
