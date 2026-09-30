/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core/server';
import type { SavedObjectsSearchResponse } from '@kbn/core-saved-objects-api-server';
import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CasePersistedStatus } from '../../common/types/case';
import type { CaseAggregationResult, FileAttachmentAggregationResults } from '../types';
import { getCasesTelemetryData } from './cases';
import { getOnlyConnectorsFilter } from './utils';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';
import { OBSERVABLE_TYPE_IPV4 } from '../../../common/constants';
import { AUTO_EXTRACT_OBSERVABLE_DESCRIPTION } from '../../../common/constants/observables';

const MOCK_FIND_TOTAL = 5;
const SOLUTION_TOTAL = 1;

describe('getCasesTelemetryData', () => {
  describe('getCasesTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

    const mockFind = (aggs: object, so: SavedObjectsFindResponse['saved_objects'] = []) => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: MOCK_FIND_TOTAL,
        saved_objects: so,
        per_page: 1,
        page: 1,
        aggregations: {
          ...aggs,
        },
      });
    };

    const mockSearch = (aggregations: Record<string, unknown>) => {
      savedObjectsClient.search.mockResolvedValueOnce({
        took: 0,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        aggregations,
      } as unknown as SavedObjectsSearchResponse);
    };

    const mockSavedObjectResponse = (attributes: Record<string, unknown>) => {
      mockFind({}, [
        {
          attributes: { ...attributes },
          score: 1,
          id: 'test',
          references: [],
          type: 'cases',
        },
      ]);
    };

    const mockResponse = () => {
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
          buckets: [
            {
              key: 50,
              doc_count: 1,
            },
            {
              key: 3,
              doc_count: 1,
            },
          ],
        },
      };

      const solutionValues = {
        counts,
        ...observables,
        ...assignees,
      };

      const caseAggsResult: CaseAggregationResult = {
        users: { value: 1 },
        tags: { value: 2 },
        ...assignees,
        counts,
        securitySolution: { ...solutionValues },
        observability: { ...solutionValues },
        cases: { ...solutionValues },
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
            {
              key: 1,
              doc_count: 1,
            },
          ],
        },
        status: {
          buckets: [
            {
              key: CasePersistedStatus.OPEN,
              doc_count: 2,
            },
          ],
        },
        totalsByOwner: {
          buckets: [
            {
              key: 'observability',
              doc_count: SOLUTION_TOTAL,
            },
            {
              key: 'securitySolution',
              doc_count: SOLUTION_TOTAL,
            },
            {
              key: 'cases',
              doc_count: SOLUTION_TOTAL,
            },
          ],
        },
      };
      const casesWithAlertsResult = {
        withAlerts: {
          doc_count: 41,
          byOwner: {
            buckets: [
              { key: 'securitySolution', doc_count: 22 },
              { key: 'observability', doc_count: 6 },
              { key: 'cases', doc_count: 13 },
            ],
          },
        },
      };

      // Same shape reused for every owner so sec/obs/main are identical.
      const legacyCommentsOwnerAgg = () => ({
        doc_count: 12,
        types: {
          buckets: [{ key: 'user', doc_count: 3 }],
        },
        alert: { doc_count: 0, entityTotal: { value: 0 } },
        event: { doc_count: 0, entityTotal: { value: 0 } },
        externalReferenceTypes: {
          buckets: [{ key: '.files', doc_count: 5 }],
        },
        persistableReferenceTypes: {
          buckets: [{ key: '.lens', doc_count: 4 }],
        },
      });

      const unifiedAttachmentsOwnerAgg = () => ({
        doc_count: 5,
        types: {
          buckets: [
            { key: 'comment', doc_count: 2, entityTotal: { value: 0 } },
            { key: 'dashboard', doc_count: 3, entityTotal: { value: 0 } },
          ],
        },
      });

      const legacyCommentsAgg = {
        securitySolution: legacyCommentsOwnerAgg(),
        observability: legacyCommentsOwnerAgg(),
        cases: legacyCommentsOwnerAgg(),
      };

      const unifiedAttachmentsAgg = {
        securitySolution: unifiedAttachmentsOwnerAgg(),
        observability: unifiedAttachmentsOwnerAgg(),
        cases: unifiedAttachmentsOwnerAgg(),
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

      mockFind(caseAggsResult); // find[0]
      mockFind(legacyCommentsAgg); // find[1] getAttachmentsByTypeData -> legacy comments
      mockFind(unifiedAttachmentsAgg); // find[2] getAttachmentsByTypeData -> unified attachments
      mockFind({ references: { referenceType: { referenceAgg: { value: 4 } } } }); // find[3] connectors

      mockSavedObjectResponse({
        created_at: '2022-03-08T12:24:11.429Z',
      }); // find[4]
      mockSavedObjectResponse({
        updated_at: '2022-03-08T12:24:11.429Z',
      }); // find[5]
      mockSavedObjectResponse({
        closed_at: '2022-03-08T12:24:11.429Z',
      }); // find[6]
      mockFind(filesRes); // find[7]

      mockSearch(casesWithAlertsResult); // search[0] cases with alerts
      mockSearch({ participants: { value: 7 } }); // search[1] participants
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('it returns the correct res', async () => {
      mockResponse();

      const filesStats = {
        averageSize: 500,
        topMimeTypes: [
          { count: 5, name: 'image/png' },
          { count: 1, name: 'application/json' },
        ],
      };

      // sec/obs/main share the same owner data; each solution has SOLUTION_TOTAL
      // (1) case, so average === total.
      const solutionAttachmentFrameworkStats = {
        attachmentFramework: {
          attachmentsByType: {
            comment: { total: 5, average: 5 },
            file: { total: 5, average: 5 },
            lens: { total: 4, average: 4 },
            dashboard: { total: 3, average: 3 },
          },
          bySavedObject: { legacy: { total: 12 }, unified: { total: 5 } },
          files: filesStats,
        },
      };

      // Merged across 3 owners; average uses MOCK_FIND_TOTAL (5) cases.
      const allAttachmentFramework = {
        attachmentFramework: {
          attachmentsByType: {
            comment: { total: 15, average: 3 },
            file: { total: 15, average: 3 },
            lens: { total: 12, average: 2 },
            dashboard: { total: 9, average: 2 },
          },
          bySavedObject: { legacy: { total: 36 }, unified: { total: 15 } },
          files: filesStats,
        },
      };

      const res = await getCasesTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });

      expect(res).toEqual({
        all: {
          total: MOCK_FIND_TOTAL,
          daily: 3,
          weekly: 2,
          monthly: 1,
          latestDates: {
            closedAt: '2022-03-08T12:24:11.429Z',
            createdAt: '2022-03-08T12:24:11.429Z',
            updatedAt: '2022-03-08T12:24:11.429Z',
          },
          status: {
            closed: 0,
            inProgress: 0,
            open: 2,
          },
          syncAlertsOff: 1,
          syncAlertsOn: 1,
          extractObservablesOff: 1,
          extractObservablesOn: 1,
          observables: {
            auto: { default: 1, custom: 0 },
            manual: { default: 0, custom: 0 },
            total: 1,
          },
          totalWithMaxObservables: 1,
          totalParticipants: 7,
          totalTags: 2,
          totalUsers: 1,
          totalWithAlerts: 41,
          totalWithConnectors: 4,
          assignees: {
            total: 5,
            totalWithZero: 100,
            totalWithAtLeastOne: 0,
          },
          ...allAttachmentFramework,
        },
        main: {
          assignees: {
            total: 5,
            totalWithZero: 100,
            totalWithAtLeastOne: 0,
          },
          ...solutionAttachmentFrameworkStats,
          total: 1,
          daily: 3,
          weekly: 2,
          monthly: 1,
          status: {
            closed: 0,
            inProgress: 0,
            open: 0,
          },
          totalWithAlerts: 13,
          observables: {
            auto: { default: 1, custom: 0 },
            manual: { default: 0, custom: 0 },
            total: 1,
          },
          totalWithMaxObservables: 1,
        },
        obs: {
          assignees: {
            total: 5,
            totalWithZero: 100,
            totalWithAtLeastOne: 0,
          },
          observables: {
            auto: { default: 1, custom: 0 },
            manual: { default: 0, custom: 0 },
            total: 1,
          },
          totalWithMaxObservables: 1,
          ...solutionAttachmentFrameworkStats,
          total: 1,
          daily: 3,
          weekly: 2,
          monthly: 1,
          status: {
            closed: 0,
            inProgress: 0,
            open: 0,
          },
          totalWithAlerts: 6,
        },
        sec: {
          assignees: {
            total: 5,
            totalWithZero: 100,
            totalWithAtLeastOne: 0,
          },
          observables: {
            auto: { default: 1, custom: 0 },
            manual: { default: 0, custom: 0 },
            total: 1,
          },
          totalWithMaxObservables: 1,
          ...solutionAttachmentFrameworkStats,
          total: 1,
          daily: 3,
          weekly: 2,
          monthly: 1,
          status: {
            closed: 0,
            inProgress: 0,
            open: 0,
          },
          totalWithAlerts: 22,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      mockResponse();

      await getCasesTelemetryData({ savedObjectsClient: telemetrySavedObjectsClient, logger });

      expect(savedObjectsClient.find.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "aggs": Object {
            "assigneeFilters": Object {
              "filters": Object {
                "filters": Object {
                  "atLeastOne": Object {
                    "bool": Object {
                      "filter": Object {
                        "exists": Object {
                          "field": "cases.attributes.assignees.uid",
                        },
                      },
                    },
                  },
                  "zero": Object {
                    "bool": Object {
                      "must_not": Object {
                        "exists": Object {
                          "field": "cases.attributes.assignees.uid",
                        },
                      },
                    },
                  },
                },
              },
            },
            "cases": Object {
              "aggs": Object {
                "assigneeFilters": Object {
                  "filters": Object {
                    "filters": Object {
                      "atLeastOne": Object {
                        "bool": Object {
                          "filter": Object {
                            "exists": Object {
                              "field": "cases.attributes.assignees.uid",
                            },
                          },
                        },
                      },
                      "zero": Object {
                        "bool": Object {
                          "must_not": Object {
                            "exists": Object {
                              "field": "cases.attributes.assignees.uid",
                            },
                          },
                        },
                      },
                    },
                  },
                },
                "counts": Object {
                  "date_range": Object {
                    "field": "cases.attributes.created_at",
                    "format": "dd/MM/yyyy",
                    "ranges": Array [
                      Object {
                        "from": "now-1d",
                        "to": "now",
                      },
                      Object {
                        "from": "now-1w",
                        "to": "now",
                      },
                      Object {
                        "from": "now-1M",
                        "to": "now",
                      },
                    ],
                  },
                },
                "observables": Object {
                  "aggs": Object {
                    "byDescription": Object {
                      "aggs": Object {
                        "byType": Object {
                          "terms": Object {
                            "field": "cases.attributes.observables.typeKey",
                          },
                        },
                      },
                      "terms": Object {
                        "field": "cases.attributes.observables.description",
                      },
                    },
                  },
                  "nested": Object {
                    "path": "cases.attributes.observables",
                  },
                },
                "status": Object {
                  "terms": Object {
                    "field": "cases.attributes.status",
                  },
                },
                "totalAssignees": Object {
                  "value_count": Object {
                    "field": "cases.attributes.assignees.uid",
                  },
                },
                "totalWithMaxObservables": Object {
                  "terms": Object {
                    "field": "cases.attributes.total_observables",
                    "order": Object {
                      "_key": "desc",
                    },
                    "size": 100,
                  },
                },
              },
              "filter": Object {
                "term": Object {
                  "cases.attributes.owner": "cases",
                },
              },
            },
            "counts": Object {
              "date_range": Object {
                "field": "cases.attributes.created_at",
                "format": "dd/MM/yyyy",
                "ranges": Array [
                  Object {
                    "from": "now-1d",
                    "to": "now",
                  },
                  Object {
                    "from": "now-1w",
                    "to": "now",
                  },
                  Object {
                    "from": "now-1M",
                    "to": "now",
                  },
                ],
              },
            },
            "extractObservables": Object {
              "terms": Object {
                "field": "cases.attributes.settings.extractObservables",
              },
            },
            "observability": Object {
              "aggs": Object {
                "assigneeFilters": Object {
                  "filters": Object {
                    "filters": Object {
                      "atLeastOne": Object {
                        "bool": Object {
                          "filter": Object {
                            "exists": Object {
                              "field": "cases.attributes.assignees.uid",
                            },
                          },
                        },
                      },
                      "zero": Object {
                        "bool": Object {
                          "must_not": Object {
                            "exists": Object {
                              "field": "cases.attributes.assignees.uid",
                            },
                          },
                        },
                      },
                    },
                  },
                },
                "counts": Object {
                  "date_range": Object {
                    "field": "cases.attributes.created_at",
                    "format": "dd/MM/yyyy",
                    "ranges": Array [
                      Object {
                        "from": "now-1d",
                        "to": "now",
                      },
                      Object {
                        "from": "now-1w",
                        "to": "now",
                      },
                      Object {
                        "from": "now-1M",
                        "to": "now",
                      },
                    ],
                  },
                },
                "observables": Object {
                  "aggs": Object {
                    "byDescription": Object {
                      "aggs": Object {
                        "byType": Object {
                          "terms": Object {
                            "field": "cases.attributes.observables.typeKey",
                          },
                        },
                      },
                      "terms": Object {
                        "field": "cases.attributes.observables.description",
                      },
                    },
                  },
                  "nested": Object {
                    "path": "cases.attributes.observables",
                  },
                },
                "status": Object {
                  "terms": Object {
                    "field": "cases.attributes.status",
                  },
                },
                "totalAssignees": Object {
                  "value_count": Object {
                    "field": "cases.attributes.assignees.uid",
                  },
                },
                "totalWithMaxObservables": Object {
                  "terms": Object {
                    "field": "cases.attributes.total_observables",
                    "order": Object {
                      "_key": "desc",
                    },
                    "size": 100,
                  },
                },
              },
              "filter": Object {
                "term": Object {
                  "cases.attributes.owner": "observability",
                },
              },
            },
            "observables": Object {
              "aggs": Object {
                "byDescription": Object {
                  "aggs": Object {
                    "byType": Object {
                      "terms": Object {
                        "field": "cases.attributes.observables.typeKey",
                      },
                    },
                  },
                  "terms": Object {
                    "field": "cases.attributes.observables.description",
                  },
                },
              },
              "nested": Object {
                "path": "cases.attributes.observables",
              },
            },
            "securitySolution": Object {
              "aggs": Object {
                "assigneeFilters": Object {
                  "filters": Object {
                    "filters": Object {
                      "atLeastOne": Object {
                        "bool": Object {
                          "filter": Object {
                            "exists": Object {
                              "field": "cases.attributes.assignees.uid",
                            },
                          },
                        },
                      },
                      "zero": Object {
                        "bool": Object {
                          "must_not": Object {
                            "exists": Object {
                              "field": "cases.attributes.assignees.uid",
                            },
                          },
                        },
                      },
                    },
                  },
                },
                "counts": Object {
                  "date_range": Object {
                    "field": "cases.attributes.created_at",
                    "format": "dd/MM/yyyy",
                    "ranges": Array [
                      Object {
                        "from": "now-1d",
                        "to": "now",
                      },
                      Object {
                        "from": "now-1w",
                        "to": "now",
                      },
                      Object {
                        "from": "now-1M",
                        "to": "now",
                      },
                    ],
                  },
                },
                "observables": Object {
                  "aggs": Object {
                    "byDescription": Object {
                      "aggs": Object {
                        "byType": Object {
                          "terms": Object {
                            "field": "cases.attributes.observables.typeKey",
                          },
                        },
                      },
                      "terms": Object {
                        "field": "cases.attributes.observables.description",
                      },
                    },
                  },
                  "nested": Object {
                    "path": "cases.attributes.observables",
                  },
                },
                "status": Object {
                  "terms": Object {
                    "field": "cases.attributes.status",
                  },
                },
                "totalAssignees": Object {
                  "value_count": Object {
                    "field": "cases.attributes.assignees.uid",
                  },
                },
                "totalWithMaxObservables": Object {
                  "terms": Object {
                    "field": "cases.attributes.total_observables",
                    "order": Object {
                      "_key": "desc",
                    },
                    "size": 100,
                  },
                },
              },
              "filter": Object {
                "term": Object {
                  "cases.attributes.owner": "securitySolution",
                },
              },
            },
            "status": Object {
              "terms": Object {
                "field": "cases.attributes.status",
              },
            },
            "syncAlerts": Object {
              "terms": Object {
                "field": "cases.attributes.settings.syncAlerts",
              },
            },
            "tags": Object {
              "cardinality": Object {
                "field": "cases.attributes.tags",
              },
            },
            "totalAssignees": Object {
              "value_count": Object {
                "field": "cases.attributes.assignees.uid",
              },
            },
            "totalWithMaxObservables": Object {
              "terms": Object {
                "field": "cases.attributes.total_observables",
                "order": Object {
                  "_key": "desc",
                },
                "size": 100,
              },
            },
            "totalsByOwner": Object {
              "terms": Object {
                "field": "cases.attributes.owner",
              },
            },
            "users": Object {
              "cardinality": Object {
                "field": "cases.attributes.created_by.username",
              },
            },
          },
          "namespaces": Array [
            "*",
          ],
          "page": 0,
          "perPage": 0,
          "type": "cases",
        }
      `);

      // getAttachmentsByTypeData issues two queries: legacy comments then unified attachments.
      const legacyCall = savedObjectsClient.find.mock.calls[1][0];
      const legacyAggs = legacyCall.aggs as Record<string, { aggs: Record<string, unknown> }>;
      expect(legacyCall.type).toBe('cases-comments');
      expect(Object.keys(legacyAggs.securitySolution.aggs)).toEqual([
        'types',
        'alert',
        'event',
        'externalReferenceTypes',
        'persistableReferenceTypes',
      ]);

      const unifiedCall = savedObjectsClient.find.mock.calls[2][0];
      const unifiedAggs = unifiedCall.aggs as Record<
        string,
        { aggs: { types: { terms: { field: string } } } }
      >;
      expect(unifiedCall.type).toBe('cases-attachments');
      expect(unifiedAggs.securitySolution.aggs.types.terms.field).toBe(
        'cases-attachments.attributes.type'
      );

      expect(savedObjectsClient.find.mock.calls[3][0]).toEqual({
        aggs: {
          references: {
            nested: { path: 'cases-user-actions.references' },
            aggregations: {
              referenceType: {
                filter: { term: { 'cases-user-actions.references.type': 'cases' } },
                aggregations: {
                  referenceAgg: { cardinality: { field: 'cases-user-actions.references.id' } },
                },
              },
            },
          },
        },
        filter: getOnlyConnectorsFilter(),
        page: 0,
        perPage: 0,
        type: 'cases-user-actions',
        namespaces: ['*'],
      });

      for (const [index, sortField] of ['created_at', 'updated_at', 'closed_at'].entries()) {
        const callIndex = index + 4;

        expect(savedObjectsClient.find.mock.calls[callIndex][0]).toEqual({
          page: 1,
          perPage: 1,
          sortField,
          sortOrder: 'desc',
          type: 'cases',
          namespaces: ['*'],
        });
      }

      expect(savedObjectsClient.find.mock.calls[7][0]).toMatchInlineSnapshot(`
        Object {
          "aggs": Object {
            "averageSize": Object {
              "avg": Object {
                "field": "file.attributes.size",
              },
            },
            "cases": Object {
              "aggs": Object {
                "averageSize": Object {
                  "avg": Object {
                    "field": "file.attributes.size",
                  },
                },
                "topMimeTypes": Object {
                  "terms": Object {
                    "field": "file.attributes.mime_type",
                    "size": 20,
                  },
                },
              },
              "filter": Object {
                "term": Object {
                  "file.attributes.Meta.owner": "cases",
                },
              },
            },
            "observability": Object {
              "aggs": Object {
                "averageSize": Object {
                  "avg": Object {
                    "field": "file.attributes.size",
                  },
                },
                "topMimeTypes": Object {
                  "terms": Object {
                    "field": "file.attributes.mime_type",
                    "size": 20,
                  },
                },
              },
              "filter": Object {
                "term": Object {
                  "file.attributes.Meta.owner": "observability",
                },
              },
            },
            "securitySolution": Object {
              "aggs": Object {
                "averageSize": Object {
                  "avg": Object {
                    "field": "file.attributes.size",
                  },
                },
                "topMimeTypes": Object {
                  "terms": Object {
                    "field": "file.attributes.mime_type",
                    "size": 20,
                  },
                },
              },
              "filter": Object {
                "term": Object {
                  "file.attributes.Meta.owner": "securitySolution",
                },
              },
            },
            "topMimeTypes": Object {
              "terms": Object {
                "field": "file.attributes.mime_type",
                "size": 20,
              },
            },
          },
          "filter": Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "file.attributes.Meta.caseIds",
              },
              Object {
                "type": "wildcard",
                "value": "@kuery-wildcard@",
              },
            ],
            "function": "is",
            "type": "function",
          },
          "namespaces": Array [
            "*",
          ],
          "page": 0,
          "perPage": 0,
          "type": "file",
        }
      `);

      expect(savedObjectsClient.search.mock.calls[0][0]).toEqual({
        type: ['cases'],
        namespaces: ['*'],
        size: 0,
        aggs: {
          withAlerts: {
            filter: { range: { 'cases.total_alerts': { gte: 1 } } },
            aggs: {
              byOwner: {
                terms: {
                  field: 'cases.owner',
                  size: 3,
                  include: ['cases', 'observability', 'securitySolution'],
                },
              },
            },
          },
        },
      });

      expect(savedObjectsClient.search.mock.calls[1][0]).toEqual({
        type: ['cases-comments', 'cases-attachments'],
        namespaces: ['*'],
        size: 0,
        runtime_mappings: {
          participant_username: {
            type: 'keyword',
            script: {
              source: expect.stringContaining('cases-comments.created_by.username'),
            },
          },
        },
        aggs: {
          participants: { cardinality: { field: 'participant_username' } },
        },
      });
    });
  });
});
