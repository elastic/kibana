/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { fromKueryExpression } from '@kbn/es-query';
import { getTemplatesTelemetryData } from './templates';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

const emptyScope = {
  total: 0,
  totalEnabled: 0,
  totalDisabled: 0,
  totalSoftDeleted: 0,
  totalMigratedFromV1: 0,
  versionPercentiles: { p50: 0, p90: 0, p99: 0 },
  fieldCount: { total: 0, max: 0, average: 0 },
  fieldDefinitions: { totalsByControl: {}, totalsByType: {} },
  cases: {
    withTemplate: { total: 0, monthly: 0, weekly: 0, daily: 0 },
    withoutTemplate: { total: 0, monthly: 0, weekly: 0, daily: 0 },
  },
};

const emptyFindResponse = {
  total: 0,
  saved_objects: [],
  per_page: 0,
  page: 0,
};

/** `getCountsFromBuckets` reads the date_range buckets in month, week, day order. */
const rangeBuckets = (monthly: number, weekly: number, daily: number) => ({
  buckets: [{ doc_count: monthly }, { doc_count: weekly }, { doc_count: daily }],
});

/**
 * What Elasticsearch returns for an owner whose filter bucket matched no document. The
 * bucket is always present, `sum` reports 0, and `max`/`avg` report null — so this is the
 * shape that exercises the assembly's null guards. Omitting the bucket entirely, which an
 * earlier version of this fixture did, never happens for a filter aggregation.
 */
const emptyInventoryScope = {
  doc_count: 0,
  enabledStates: { buckets: [] },
  migratedFromV1: { doc_count: 0 },
  versionPercentiles: { values: { '50.0': null, '90.0': null, '99.0': null } },
  totalFieldCount: { value: 0 },
  maxFieldCount: { value: null },
  averageFieldCount: { value: null },
  fieldDefinitions: { byControl: { buckets: [] }, byType: { buckets: [] } },
};

const emptyAdoptionScope = {
  templateAdoption: {
    buckets: {
      withTemplate: { doc_count: 0, counts: rangeBuckets(0, 0, 0) },
      withoutTemplate: { doc_count: 0, counts: rangeBuckets(0, 0, 0) },
    },
  },
};

const securitySolutionInventory = {
  enabledStates: {
    buckets: [
      { key: 1, doc_count: 3 },
      { key: 0, doc_count: 1 },
    ],
  },
  migratedFromV1: { doc_count: 2 },
  versionPercentiles: {
    values: { '50.0': 1, '90.0': 3.6, '99.0': 4 },
  },
  totalFieldCount: { value: 12 },
  maxFieldCount: { value: 8 },
  averageFieldCount: { value: 3 },
  fieldDefinitions: {
    byControl: { buckets: [{ key: 'input_text', doc_count: 7 }] },
    byType: { buckets: [{ key: 'keyword', doc_count: 7 }] },
  },
};

const inventoryFindResponse = {
  ...emptyFindResponse,
  total: 7,
  aggregations: {
    totalsByOwner: {
      buckets: [
        { key: 'securitySolution', doc_count: 4 },
        { key: 'observability', doc_count: 2 },
        { key: 'cases', doc_count: 1 },
      ],
    },
    enabledStates: {
      buckets: [
        { key: 1, doc_count: 5 },
        { key: 0, doc_count: 2 },
      ],
    },
    migratedFromV1: { doc_count: 3 },
    versionPercentiles: {
      values: { '50.0': 1, '90.0': 4.6, '99.0': 5 },
    },
    totalFieldCount: { value: 21 },
    maxFieldCount: { value: 8 },
    // Deliberately fractional: the payload declares a `long`, so this must be rounded.
    averageFieldCount: { value: 3.4 },
    fieldDefinitions: {
      byControl: {
        buckets: [
          { key: 'input_text', doc_count: 12 },
          { key: 'select', doc_count: 9 },
        ],
      },
      byType: {
        buckets: [
          { key: 'keyword', doc_count: 15 },
          { key: 'long', doc_count: 6 },
        ],
      },
    },
    securitySolution: securitySolutionInventory,
    // Both report zero live templates while the owner terms aggregation still counts
    // documents for them, so these two prove the per-scope zero-fill and the null guards.
    observability: emptyInventoryScope,
    cases: emptyInventoryScope,
  },
};

const softDeletedFindResponse = {
  ...emptyFindResponse,
  total: 3,
  aggregations: {
    totalsByOwner: {
      buckets: [
        { key: 'securitySolution', doc_count: 2 },
        { key: 'cases', doc_count: 1 },
      ],
    },
  },
};

const adoptionFindResponse = {
  ...emptyFindResponse,
  total: 100,
  aggregations: {
    templateAdoption: {
      buckets: {
        withTemplate: { doc_count: 40, counts: rangeBuckets(30, 12, 4) },
        withoutTemplate: { doc_count: 60, counts: rangeBuckets(50, 20, 6) },
      },
    },
    securitySolution: {
      templateAdoption: {
        buckets: {
          withTemplate: { doc_count: 25, counts: rangeBuckets(20, 8, 2) },
          withoutTemplate: { doc_count: 15, counts: rangeBuckets(10, 5, 1) },
        },
      },
    },
    observability: emptyAdoptionScope,
    cases: emptyAdoptionScope,
  },
};

describe('templates', () => {
  describe('getTemplatesTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

    const getTelemetry = () =>
      getTemplatesTelemetryData({ savedObjectsClient: telemetrySavedObjectsClient, logger });

    const mockResponses = (
      inventory: unknown = inventoryFindResponse,
      softDeleted: unknown = softDeletedFindResponse,
      adoption: unknown = adoptionFindResponse
    ) => {
      savedObjectsClient.find
        .mockResolvedValueOnce(inventory as never)
        .mockResolvedValueOnce(softDeleted as never)
        .mockResolvedValueOnce(adoption as never);
    };

    beforeEach(() => {
      // `resetAllMocks`, not `clearAllMocks`: the latter keeps implementations, so the
      // rejection queued by the failure case below would stay the default for every test
      // declared after it.
      jest.resetAllMocks();
    });

    it('returns the correct res', async () => {
      mockResponses();

      expect(await getTelemetry()).toEqual({
        all: {
          total: 7,
          totalEnabled: 5,
          totalDisabled: 2,
          totalSoftDeleted: 3,
          totalMigratedFromV1: 3,
          versionPercentiles: { p50: 1, p90: 5, p99: 5 },
          fieldCount: { total: 21, max: 8, average: 3 },
          fieldDefinitions: {
            totalsByControl: { input_text: 12, select: 9 },
            totalsByType: { keyword: 15, long: 6 },
          },
          cases: {
            withTemplate: { total: 40, monthly: 30, weekly: 12, daily: 4 },
            withoutTemplate: { total: 60, monthly: 50, weekly: 20, daily: 6 },
          },
        },
        sec: {
          total: 4,
          totalEnabled: 3,
          totalDisabled: 1,
          totalSoftDeleted: 2,
          totalMigratedFromV1: 2,
          versionPercentiles: { p50: 1, p90: 4, p99: 4 },
          fieldCount: { total: 12, max: 8, average: 3 },
          fieldDefinitions: {
            totalsByControl: { input_text: 7 },
            totalsByType: { keyword: 7 },
          },
          cases: {
            withTemplate: { total: 25, monthly: 20, weekly: 8, daily: 2 },
            withoutTemplate: { total: 15, monthly: 10, weekly: 5, daily: 1 },
          },
        },
        obs: { ...emptyScope, total: 2 },
        main: { ...emptyScope, total: 1, totalSoftDeleted: 1 },
      });
    });

    it('returns a fully zeroed res when no read returns aggregations', async () => {
      mockResponses(emptyFindResponse, emptyFindResponse, emptyFindResponse);

      expect(await getTelemetry()).toEqual({
        all: emptyScope,
        sec: emptyScope,
        obs: emptyScope,
        main: emptyScope,
      });
    });

    it('keeps an empty control or type out of the field-definition maps', async () => {
      // The aggregation excludes the empty term, so a response carrying one means the
      // exclusion was dropped. Guard the assembly as well as the query arguments.
      mockResponses({
        ...inventoryFindResponse,
        aggregations: {
          ...inventoryFindResponse.aggregations,
          fieldDefinitions: {
            byControl: {
              buckets: [
                { key: 'input_text', doc_count: 12 },
                { key: '', doc_count: 5 },
              ],
            },
            byType: {
              buckets: [
                { key: 'keyword', doc_count: 15 },
                { key: '', doc_count: 5 },
              ],
            },
          },
        },
      });

      expect((await getTelemetry()).all.fieldDefinitions).toEqual({
        totalsByControl: { input_text: 12 },
        totalsByType: { keyword: 15 },
      });
    });

    it('rounds the average field count', async () => {
      mockResponses({
        ...inventoryFindResponse,
        aggregations: {
          ...inventoryFindResponse.aggregations,
          averageFieldCount: { value: 3.5 },
        },
      });

      expect((await getTelemetry()).all.fieldCount.average).toBe(4);
    });

    it('logs and rethrows when a read fails', async () => {
      savedObjectsClient.find.mockRejectedValue(new Error('failed'));

      await expect(getTelemetry()).rejects.toThrow('failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Cases templates telemetry failed with error: Error: failed'
      );
    });

    it('should call find with correct arguments for the live template inventory', async () => {
      mockResponses();
      await getTelemetry();

      const ownerAggregations = {
        enabledStates: {
          terms: { field: 'cases-templates.attributes.isEnabled', missing: true },
        },
        migratedFromV1: { filter: { exists: { field: 'cases-templates.attributes.legacyKey' } } },
        versionPercentiles: {
          percentiles: {
            field: 'cases-templates.attributes.templateVersion',
            percents: [50, 90, 99],
          },
        },
        totalFieldCount: { sum: { field: 'cases-templates.attributes.fieldCount' } },
        maxFieldCount: { max: { field: 'cases-templates.attributes.fieldCount' } },
        averageFieldCount: { avg: { field: 'cases-templates.attributes.fieldCount' } },
        fieldDefinitions: {
          nested: { path: 'cases-templates.attributes.fieldDefinitions' },
          aggs: {
            byControl: {
              terms: {
                field: 'cases-templates.attributes.fieldDefinitions.control',
                size: 20,
                exclude: [''],
              },
            },
            byType: {
              terms: {
                field: 'cases-templates.attributes.fieldDefinitions.type',
                size: 20,
                exclude: [''],
              },
            },
          },
        },
      };

      expect(savedObjectsClient.find).toHaveBeenNthCalledWith(1, {
        page: 0,
        perPage: 0,
        type: 'cases-templates',
        namespaces: ['*'],
        filter: fromKueryExpression(
          'cases-templates.attributes.isLatest: true AND NOT cases-templates.attributes.deletedAt: *'
        ),
        aggs: {
          cases: {
            filter: { term: { 'cases-templates.attributes.owner': 'cases' } },
            aggs: ownerAggregations,
          },
          observability: {
            filter: { term: { 'cases-templates.attributes.owner': 'observability' } },
            aggs: ownerAggregations,
          },
          securitySolution: {
            filter: { term: { 'cases-templates.attributes.owner': 'securitySolution' } },
            aggs: ownerAggregations,
          },
          ...ownerAggregations,
          totalsByOwner: { terms: { field: 'cases-templates.attributes.owner' } },
        },
      });
    });

    it('should call find with correct arguments for the soft-deleted templates', async () => {
      mockResponses();
      await getTelemetry();

      expect(savedObjectsClient.find).toHaveBeenNthCalledWith(2, {
        page: 0,
        perPage: 0,
        type: 'cases-templates',
        namespaces: ['*'],
        filter: fromKueryExpression(
          'cases-templates.attributes.isLatest: true AND cases-templates.attributes.deletedAt: *'
        ),
        aggs: {
          totalsByOwner: { terms: { field: 'cases-templates.attributes.owner' } },
        },
      });
    });

    it('should call find with correct arguments for the case adoption split', async () => {
      mockResponses();
      await getTelemetry();

      const ownerAggregations = {
        templateAdoption: {
          filters: {
            filters: {
              withTemplate: {
                bool: { filter: { exists: { field: 'cases.attributes.template.id' } } },
              },
              withoutTemplate: {
                bool: { must_not: { exists: { field: 'cases.attributes.template.id' } } },
              },
            },
          },
          aggs: {
            counts: {
              date_range: {
                field: 'cases.attributes.created_at',
                format: 'dd/MM/yyyy',
                ranges: [
                  { from: 'now-1d', to: 'now' },
                  { from: 'now-1w', to: 'now' },
                  { from: 'now-1M', to: 'now' },
                ],
              },
            },
          },
        },
      };

      expect(savedObjectsClient.find).toHaveBeenNthCalledWith(3, {
        page: 0,
        perPage: 0,
        type: 'cases',
        namespaces: ['*'],
        aggs: {
          cases: {
            filter: { term: { 'cases.attributes.owner': 'cases' } },
            aggs: ownerAggregations,
          },
          observability: {
            filter: { term: { 'cases.attributes.owner': 'observability' } },
            aggs: ownerAggregations,
          },
          securitySolution: {
            filter: { term: { 'cases.attributes.owner': 'securitySolution' } },
            aggs: ownerAggregations,
          },
          ...ownerAggregations,
        },
      });
    });
  });
});
