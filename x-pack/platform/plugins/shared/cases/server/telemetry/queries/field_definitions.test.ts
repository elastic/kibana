/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getEmptyFieldLibraryTelemetry, getFieldLibraryTelemetryData } from './field_definitions';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

const emptyScope = { total: 0, totalGlobal: 0, totalReusable: 0 };

const emptyFindResponse = {
  total: 0,
  saved_objects: [],
  per_page: 0,
  page: 0,
};

const globalStates = (global: number, reusable: number) => ({
  buckets: [
    { key: 1, doc_count: global },
    { key: 0, doc_count: reusable },
  ],
});

// `all` exceeds the three solution scopes combined: two definitions belong to an owner outside
// the registered solutions, and must still roll up.
const findResponse = {
  ...emptyFindResponse,
  total: 9,
  aggregations: {
    globalStates: globalStates(5, 4),
    securitySolution: { doc_count: 4, globalStates: globalStates(3, 1) },
    observability: { doc_count: 2, globalStates: { buckets: [{ key: 0, doc_count: 2 }] } },
    cases: { doc_count: 1, globalStates: { buckets: [{ key: 1, doc_count: 1 }] } },
  },
};

describe('field definitions', () => {
  describe('getFieldLibraryTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

    const getTelemetry = () =>
      getFieldLibraryTelemetryData({ savedObjectsClient: telemetrySavedObjectsClient, logger });

    const mockResponse = (response: unknown = findResponse) => {
      savedObjectsClient.find.mockResolvedValue(response as never);
    };

    beforeEach(() => {
      // `resetAllMocks`, not `clearAllMocks`: the latter would leave the rejection queued by the
      // failure case below as the default for every test declared after it.
      jest.resetAllMocks();
    });

    it('returns the correct res', async () => {
      mockResponse();

      expect(await getTelemetry()).toEqual({
        all: { total: 9, totalGlobal: 5, totalReusable: 4 },
        sec: { total: 4, totalGlobal: 3, totalReusable: 1 },
        obs: { total: 2, totalGlobal: 0, totalReusable: 2 },
        main: { total: 1, totalGlobal: 1, totalReusable: 0 },
      });
    });

    it('reports a global and reusable split that accounts for every definition in the scope', async () => {
      mockResponse();

      const scopes = Object.values(await getTelemetry());

      expect(scopes).toHaveLength(4);
      scopes.forEach(({ total, totalGlobal, totalReusable }) => {
        expect(totalGlobal + totalReusable).toBe(total);
      });
    });

    it('counts past the search hit cap', async () => {
      // `res.total` saturates at 10,000; the aggregation stays exact, so it must be the source.
      mockResponse({
        ...findResponse,
        total: 10000,
        aggregations: { ...findResponse.aggregations, globalStates: globalStates(7000, 5000) },
      });

      expect((await getTelemetry()).all).toEqual({
        total: 12000,
        totalGlobal: 7000,
        totalReusable: 5000,
      });
    });

    it('returns a fully zeroed res when the read returns no aggregations', async () => {
      mockResponse(emptyFindResponse);

      expect(await getTelemetry()).toEqual({
        all: emptyScope,
        sec: emptyScope,
        obs: emptyScope,
        main: emptyScope,
      });
    });

    it('zeroes only the scope whose aggregation is absent', async () => {
      const { globalStates: _topLevel, ...withoutTopLevel } = findResponse.aggregations;
      mockResponse({ ...findResponse, aggregations: withoutTopLevel });

      const res = await getTelemetry();

      expect(res.all).toEqual(emptyScope);
      expect(res.sec).toEqual({ total: 4, totalGlobal: 3, totalReusable: 1 });
    });

    it('zeroes a solution whose filter bucket matched no document', async () => {
      mockResponse({
        ...findResponse,
        aggregations: {
          ...findResponse.aggregations,
          securitySolution: { doc_count: 0, globalStates: { buckets: [] } },
        },
      });

      expect((await getTelemetry()).sec).toEqual(emptyScope);
    });

    it('logs and rethrows when the read fails', async () => {
      savedObjectsClient.find.mockRejectedValue(new Error('failed'));

      await expect(getTelemetry()).rejects.toThrow('failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Cases field library telemetry failed with error: Error: failed'
      );
    });

    it('should call find with correct arguments', async () => {
      mockResponse();
      await getTelemetry();

      const ownerAggregations = {
        globalStates: {
          terms: { field: 'cases-field-definition.attributes.isGlobal', missing: false },
        },
      };

      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        page: 0,
        perPage: 0,
        type: 'cases-field-definition',
        namespaces: ['*'],
        aggs: {
          cases: {
            filter: { term: { 'cases-field-definition.attributes.owner': 'cases' } },
            aggs: ownerAggregations,
          },
          observability: {
            filter: { term: { 'cases-field-definition.attributes.owner': 'observability' } },
            aggs: ownerAggregations,
          },
          securitySolution: {
            filter: { term: { 'cases-field-definition.attributes.owner': 'securitySolution' } },
            aggs: ownerAggregations,
          },
          ...ownerAggregations,
        },
      });
    });
  });

  describe('getEmptyFieldLibraryTelemetry', () => {
    it('returns every scope zeroed', () => {
      expect(getEmptyFieldLibraryTelemetry()).toEqual({
        all: emptyScope,
        sec: emptyScope,
        obs: emptyScope,
        main: emptyScope,
      });
    });
  });
});
