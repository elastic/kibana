/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { CustomFieldTypes } from '../../../common/types/domain';
import {
  AUTO_EXTRACT_OBSERVABLE_DESCRIPTION,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_HOSTNAME,
} from '../../../common/constants/observables';
import type { CaseAggregationResult, FileAttachmentAggregationResults } from '../types';
import type { AttachmentsByTypeRaw } from './attachments_by_type';
import {
  findValueInBuckets,
  getAggregationsBuckets,
  getAlertsCountsFromBuckets,
  getBucketFromAggregation,
  getConnectorsCardinalityAggregationQuery,
  getCountsAggregationQuery,
  getCountsAndMaxData,
  getCountsFromBuckets,
  getCustomFieldsTelemetry,
  getMaxBucketOnCaseAggregationQuery,
  getOnlyAlertsCommentsFilter,
  getOnlyConnectorsFilter,
  getReferencesAggregationQuery,
  getSolutionValues,
  getUniqueAlertCommentsCountQuery,
  getObservablesTotalsByType,
  getTotalWithMaxObservables,
} from './utils';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

describe('utils', () => {
  describe('getSolutionValues', () => {
    const counts = {
      buckets: [
        { doc_count: 1, key: 1 },
        { doc_count: 2, key: 2 },
        { doc_count: 3, key: 3 },
      ],
    };

    const assignees = {
      assigneeFilters: {
        buckets: {
          atLeastOne: {
            doc_count: 0,
          },
          zero: {
            doc_count: 100,
          },
        },
      },
      totalAssignees: { value: 5 },
    };

    const observables = {
      observables: {
        doc_count: 1,
        byDescription: {
          buckets: [
            {
              key: AUTO_EXTRACT_OBSERVABLE_DESCRIPTION,
              doc_count: 1,
              byType: {
                buckets: [
                  {
                    key: OBSERVABLE_TYPE_IPV4.key,
                    doc_count: 1,
                  },
                ],
              },
            },
          ],
        },
      },
      totalWithMaxObservables: {
        doc_count: 3,
        buckets: [
          {
            key: 3,
            doc_count: 3,
          },
        ],
      },
    };

    const caseSolutionValues = {
      counts,
      ...assignees,
      ...observables,
    };

    const caseAggsResult: CaseAggregationResult = {
      users: { value: 1 },
      tags: { value: 2 },
      ...assignees,
      counts,
      securitySolution: { ...caseSolutionValues },
      observability: { ...caseSolutionValues },
      cases: { ...caseSolutionValues },
      ...observables,
      syncAlerts: {
        buckets: [
          {
            key: 0,
            doc_count: 1,
          },
          {
            key: 1,
            doc_count: 1,
          },
        ],
      },
      extractObservables: {
        buckets: [
          {
            key: 0,
            doc_count: 1,
          },
        ],
      },
      status: {
        buckets: [
          {
            key: 'open',
            doc_count: 2,
          },
        ],
      },
      totalsByOwner: {
        buckets: [
          {
            key: 'observability',
            doc_count: 1,
          },
          {
            key: 'securitySolution',
            doc_count: 5,
          },
          {
            key: 'cases',
            doc_count: 1,
          },
        ],
      },
    };

    // `byType` keys are already unified type names (legacy keys are mapped in
    // the collector before this stage); `security.alert` is sanitized to
    // `security_alert` by the framework builder.
    const rawScope = (): AttachmentsByTypeRaw['all'] => ({
      byType: {
        osquery: { total: 5 },
        file: { total: 5 },
        'security.alert': { total: 20 },
      },
      bySavedObject: { legacy: { total: 8 }, unified: { total: 2 } },
    });

    const attachmentsByType: AttachmentsByTypeRaw = {
      all: rawScope(),
      securitySolution: rawScope(),
      observability: rawScope(),
      cases: rawScope(),
    };

    const filesRes: FileAttachmentAggregationResults = {
      securitySolution: {
        averageSize: { value: 500 },
        topMimeTypes: {
          buckets: [
            {
              doc_count: 5,
              key: 'image/png',
            },
            {
              doc_count: 1,
              key: 'application/json',
            },
          ],
        },
      },
      observability: {
        averageSize: { value: 500 },
        topMimeTypes: {
          buckets: [
            {
              doc_count: 5,
              key: 'image/png',
            },
            {
              doc_count: 1,
              key: 'application/json',
            },
          ],
        },
      },
      cases: {
        averageSize: { value: 500 },
        topMimeTypes: {
          buckets: [
            {
              doc_count: 5,
              key: 'image/png',
            },
            {
              doc_count: 1,
              key: 'application/json',
            },
          ],
        },
      },
      averageSize: { value: 500 },
      topMimeTypes: {
        buckets: [
          {
            doc_count: 5,
            key: 'image/png',
          },
          {
            doc_count: 1,
            key: 'application/json',
          },
        ],
      },
    };
    it('constructs the solution values correctly for a solution owner', () => {
      const res = getSolutionValues({
        caseAggregations: caseAggsResult,
        attachmentsByType,
        filesAggregations: filesRes,
        owner: 'securitySolution',
        totalWithAlertsByOwner: { securitySolution: 20, observability: 5, cases: 10 },
      });

      // securitySolution has 5 cases (from totalsByOwner), so average = round(total / 5).
      expect(res.attachmentFramework).toEqual({
        attachmentsByType: {
          osquery: { total: 5, average: 1 },
          file: { total: 5, average: 1 },
          // keys are sanitized: `security.alert` -> `security_alert`
          security_alert: { total: 20, average: 4 },
        },
        bySavedObject: { legacy: { total: 8 }, unified: { total: 2 } },
        files: {
          averageSize: 500,
          topMimeTypes: [
            { count: 5, name: 'image/png' },
            { count: 1, name: 'application/json' },
          ],
        },
      });
      expect(res.total).toBe(5);
      expect(res.totalWithAlerts).toBe(20);
    });

    it('uses the per-owner case total for the average (owner with a single case)', () => {
      const res = getSolutionValues({
        caseAggregations: caseAggsResult,
        attachmentsByType,
        filesAggregations: filesRes,
        owner: 'cases',
        totalWithAlertsByOwner: { securitySolution: 20, observability: 5, cases: 10 },
      });

      // cases has 1 case, so average === total.
      expect(res.attachmentFramework.attachmentsByType).toEqual({
        osquery: { total: 5, average: 5 },
        file: { total: 5, average: 5 },
        security_alert: { total: 20, average: 20 },
      });
      expect(res.total).toBe(1);
      expect(res.totalWithAlerts).toBe(10);
    });

    it('returns an empty attachmentsByType map when the scope has no data', () => {
      const res = getSolutionValues({
        caseAggregations: caseAggsResult,
        attachmentsByType: undefined,
        filesAggregations: filesRes,
        owner: 'securitySolution',
        totalWithAlertsByOwner: { securitySolution: 20, observability: 5, cases: 10 },
      });

      expect(res.attachmentFramework.attachmentsByType).toEqual({});
      expect(res.attachmentFramework.bySavedObject).toEqual({
        legacy: { total: 0 },
        unified: { total: 0 },
      });
    });
  });

  describe('getCountsAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(getCountsAggregationQuery('test')).toEqual({
        counts: {
          date_range: {
            field: 'test.attributes.created_at',
            format: 'dd/MM/yyyy',
            ranges: [
              { from: 'now-1d', to: 'now' },
              { from: 'now-1w', to: 'now' },
              { from: 'now-1M', to: 'now' },
            ],
          },
        },
      });
    });
  });

  describe('getMaxBucketOnCaseAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(getMaxBucketOnCaseAggregationQuery('test')).toEqual({
        references: {
          nested: {
            path: 'test.references',
          },
          aggregations: {
            cases: {
              filter: {
                term: {
                  'test.references.type': 'cases',
                },
              },
              aggregations: {
                ids: {
                  terms: {
                    field: 'test.references.id',
                  },
                },
                max: {
                  max_bucket: {
                    buckets_path: 'ids._count',
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getReferencesAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(
        getReferencesAggregationQuery({ savedObjectType: 'test', referenceType: 'cases' })
      ).toEqual({
        references: {
          nested: {
            path: 'test.references',
          },
          aggregations: {
            referenceType: {
              filter: {
                term: {
                  'test.references.type': 'cases',
                },
              },
              aggregations: {
                referenceAgg: {
                  terms: {
                    field: 'test.references.id',
                  },
                },
              },
            },
          },
        },
      });
    });

    it('returns the correct query when changing the agg', () => {
      expect(
        getReferencesAggregationQuery({
          savedObjectType: 'test',
          referenceType: 'cases',
          agg: 'cardinality',
        })
      ).toEqual({
        references: {
          nested: {
            path: 'test.references',
          },
          aggregations: {
            referenceType: {
              filter: {
                term: {
                  'test.references.type': 'cases',
                },
              },
              aggregations: {
                referenceAgg: {
                  cardinality: {
                    field: 'test.references.id',
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getConnectorsCardinalityAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(getConnectorsCardinalityAggregationQuery()).toEqual({
        references: {
          nested: {
            path: 'cases-user-actions.references',
          },
          aggregations: {
            referenceType: {
              filter: {
                term: {
                  'cases-user-actions.references.type': 'action',
                },
              },
              aggregations: {
                referenceAgg: {
                  cardinality: {
                    field: 'cases-user-actions.references.id',
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getCountsFromBuckets', () => {
    it('returns the correct counts', () => {
      const buckets = [
        { doc_count: 1, key: 1 },
        { doc_count: 2, key: 2 },
        { doc_count: 3, key: 3 },
      ];

      expect(getCountsFromBuckets(buckets)).toEqual({
        daily: 3,
        weekly: 2,
        monthly: 1,
      });
    });

    it('returns zero counts when the bucket do not have the doc_count field', () => {
      const buckets = [{}];
      // @ts-expect-error
      expect(getCountsFromBuckets(buckets)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 0,
      });
    });

    it('returns zero counts when the bucket is undefined', () => {
      // @ts-expect-error
      expect(getCountsFromBuckets(undefined)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 0,
      });
    });

    it('returns zero counts when the doc_count field is missing in some buckets', () => {
      const buckets = [{ doc_count: 1, key: 1 }, {}, {}];
      // @ts-expect-error
      expect(getCountsFromBuckets(buckets)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 1,
      });
    });
  });

  describe('getAlertsCountsFromBuckets', () => {
    it('returns the correct counts', () => {
      const buckets = [
        { topAlertsPerBucket: { value: 12 } },
        { topAlertsPerBucket: { value: 5 } },
        { topAlertsPerBucket: { value: 3 } },
      ];

      expect(getAlertsCountsFromBuckets(buckets)).toEqual({
        daily: 3,
        weekly: 5,
        monthly: 12,
      });
    });

    it('returns zero counts when the bucket does not have the topAlertsPerBucket field', () => {
      const buckets = [{}];
      // @ts-expect-error
      expect(getAlertsCountsFromBuckets(buckets)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 0,
      });
    });

    it('returns zero counts when the bucket is undefined', () => {
      // @ts-expect-error
      expect(getAlertsCountsFromBuckets(undefined)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 0,
      });
    });

    it('returns zero counts when the topAlertsPerBucket field is missing in some buckets', () => {
      const buckets = [{ doc_count: 1, key: 1, topAlertsPerBucket: { value: 5 } }, {}, {}];
      // @ts-expect-error
      expect(getAlertsCountsFromBuckets(buckets)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 5,
      });
    });
  });

  describe('getUniqueAlertCommentsCountQuery', () => {
    it('returns the correct query', () => {
      expect(getUniqueAlertCommentsCountQuery()).toEqual({
        uniqueAlertCommentsCount: {
          cardinality: {
            field: 'cases-comments.attributes.alertId',
          },
        },
      });
    });
  });

  describe('getCountsAndMaxData', () => {
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    savedObjectsClient.find.mockResolvedValue({
      total: 5,
      saved_objects: [],
      per_page: 1,
      page: 1,
      aggregations: {
        counts: {
          buckets: [
            { doc_count: 1, key: 1 },
            { doc_count: 2, key: 2 },
            { doc_count: 3, key: 3 },
          ],
        },
        references: { cases: { max: { value: 1 } } },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns the correct counts and max data', async () => {
      const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

      const res = await getCountsAndMaxData({
        savedObjectsClient: telemetrySavedObjectsClient,
        savedObjectType: 'test',
      });
      expect(res).toEqual({
        all: {
          total: 5,
          daily: 3,
          weekly: 2,
          monthly: 1,
          maxOnACase: 1,
        },
      });
    });

    it('returns zero data if the response aggregation is not as expected', async () => {
      const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);
      savedObjectsClient.find.mockResolvedValue({
        total: 5,
        saved_objects: [],
        per_page: 1,
        page: 1,
      });

      const res = await getCountsAndMaxData({
        savedObjectsClient: telemetrySavedObjectsClient,
        savedObjectType: 'test',
      });
      expect(res).toEqual({
        all: {
          total: 5,
          daily: 0,
          weekly: 0,
          monthly: 0,
          maxOnACase: 0,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

      await getCountsAndMaxData({
        savedObjectsClient: telemetrySavedObjectsClient,
        savedObjectType: 'test',
      });

      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        aggs: {
          counts: {
            date_range: {
              field: 'test.attributes.created_at',
              format: 'dd/MM/yyyy',
              ranges: [
                {
                  from: 'now-1d',
                  to: 'now',
                },
                {
                  from: 'now-1w',
                  to: 'now',
                },
                {
                  from: 'now-1M',
                  to: 'now',
                },
              ],
            },
          },
          references: {
            aggregations: {
              cases: {
                aggregations: {
                  ids: {
                    terms: {
                      field: 'test.references.id',
                    },
                  },
                  max: {
                    max_bucket: {
                      buckets_path: 'ids._count',
                    },
                  },
                },
                filter: {
                  term: {
                    'test.references.type': 'cases',
                  },
                },
              },
            },
            nested: {
              path: 'test.references',
            },
          },
        },
        filter: undefined,
        page: 0,
        perPage: 0,
        type: 'test',
        namespaces: ['*'],
      });
    });
  });

  describe('getBucketFromAggregation', () => {
    it('returns the buckets', () => {
      expect(
        getBucketFromAggregation({
          aggs: { test: { deep: { buckets: [{ doc_count: 1, key: 1 }] } } },
          key: 'test.deep',
        })
      ).toEqual([{ doc_count: 1, key: 1 }]);
    });

    it('returns an empty array if the path does not exist', () => {
      expect(
        getBucketFromAggregation({
          key: 'test.deep',
        })
      ).toEqual([]);
    });
  });

  describe('findValueInBuckets', () => {
    it('find the value in the bucket', () => {
      const buckets = [
        { doc_count: 1, key: 'test' },
        { doc_count: 2, key: 'not' },
      ];
      expect(findValueInBuckets(buckets, 'test')).toBe(1);
    });

    it('return zero if the value is not found', () => {
      const buckets = [{ doc_count: 1, key: 'test' }];
      expect(findValueInBuckets(buckets, 'not-in-the-bucket')).toBe(0);
    });
  });

  describe('getAggregationsBuckets', () => {
    it('return aggregation buckets', () => {
      const buckets = [
        { doc_count: 1, key: 'test' },
        { doc_count: 2, key: 'not' },
      ];

      const aggs = {
        foo: { baz: { buckets } },
        bar: { buckets },
      };

      expect(getAggregationsBuckets({ aggs, keys: ['foo.baz', 'bar'] })).toEqual({
        'foo.baz': buckets,
        bar: buckets,
      });
    });
  });

  describe('getOnlyAlertsCommentsFilter', () => {
    it('return the correct filter', () => {
      expect(getOnlyAlertsCommentsFilter()).toEqual({
        arguments: [
          {
            type: 'literal',
            value: 'cases-comments.attributes.type',
            isQuoted: false,
          },
          {
            type: 'literal',
            value: 'alert',
            isQuoted: false,
          },
        ],
        function: 'is',
        type: 'function',
      });
    });
  });

  describe('getOnlyConnectorsFilter', () => {
    it('return the correct filter', () => {
      expect(getOnlyConnectorsFilter()).toEqual({
        arguments: [
          {
            type: 'literal',
            value: 'cases-user-actions.attributes.type',
            isQuoted: false,
          },
          {
            type: 'literal',
            value: 'connector',
            isQuoted: false,
          },
        ],
        function: 'is',
        type: 'function',
      });
    });
  });

  describe('getCustomFieldsTelemetry', () => {
    const customFieldsMock = [
      {
        key: 'foobar1',
        label: 'foobar1',
        type: CustomFieldTypes.TEXT,
        required: false,
      },
      {
        key: 'foobar2',
        label: 'foobar2',
        type: CustomFieldTypes.TOGGLE,
        required: true,
      },
      {
        key: 'foobar3',
        label: 'foobar3',
        type: 'foo',
        required: true,
      },
      {
        key: 'foobar4',
        label: 'foobar4',
        type: CustomFieldTypes.TOGGLE,
        required: true,
      },
    ];

    it('returns customFields telemetry correctly', () => {
      expect(getCustomFieldsTelemetry(customFieldsMock)).toEqual({
        totalsByType: {
          text: 1,
          toggle: 2,
          foo: 1,
        },
        totals: 4,
        required: 3,
      });
    });

    it('returns correctly when customFields undefined', () => {
      expect(getCustomFieldsTelemetry(undefined)).toEqual({
        totalsByType: {},
        totals: 0,
        required: 0,
      });
    });

    it('returns correctly when customFields empty', () => {
      expect(getCustomFieldsTelemetry([])).toEqual({
        totalsByType: {},
        totals: 0,
        required: 0,
      });
    });
  });

  describe('getObservablesTotalsByType', () => {
    it('returns the correct observables totals by type', () => {
      expect(
        getObservablesTotalsByType({
          doc_count: 6,
          byDescription: {
            buckets: [
              {
                key: AUTO_EXTRACT_OBSERVABLE_DESCRIPTION,
                doc_count: 2,
                byType: {
                  buckets: [
                    {
                      key: OBSERVABLE_TYPE_IPV4.key,
                      doc_count: 2,
                    },
                  ],
                },
              },
              {
                key: 'Bad host',
                doc_count: 3,
                byType: {
                  buckets: [
                    {
                      key: OBSERVABLE_TYPE_HOSTNAME.key,
                      doc_count: 3,
                    },
                  ],
                },
              },
              {
                key: 'User added',
                doc_count: 1,
                byType: {
                  buckets: [
                    {
                      key: 'key1',
                      doc_count: 1,
                    },
                  ],
                },
              },
            ],
          },
        })
      ).toEqual({
        manual: { default: 3, custom: 1 },
        auto: { default: 2, custom: 0 },
        total: 6,
      });
    });
  });

  describe('getTotalWithMaxObservables', () => {
    it('returns the correct total when response is undefined', () => {
      expect(getTotalWithMaxObservables(undefined)).toEqual(0);
    });

    it('returns the correct total when no case has observables', () => {
      expect(getTotalWithMaxObservables([])).toEqual(0);
    });

    it('returns the correct total when there are cases with max observables', () => {
      expect(
        getTotalWithMaxObservables([
          { key: 50, doc_count: 20 },
          { key: 49, doc_count: 15 },
        ])
      ).toEqual(20);
    });
  });
});
