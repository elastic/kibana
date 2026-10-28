/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getUserActionsTelemetryData } from './user_actions';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

describe('user_actions', () => {
  describe('getUserActionsTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

    const countsResponse = {
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
    };

    const typeBuckets = (buckets: Array<[string, number]>) => ({
      buckets: buckets.map(([key, docCount]) => ({ key, doc_count: docCount })),
    });

    const bySourceResponse = {
      total: 5,
      saved_objects: [],
      per_page: 0,
      page: 0,
      aggregations: {
        byOwner: {
          buckets: [
            {
              key: 'securitySolution',
              doc_count: 4,
              bySource: {
                buckets: [
                  {
                    key: 'agent',
                    doc_count: 3,
                    byType: typeBuckets([
                      ['comment', 2],
                      ['status', 1],
                    ]),
                  },
                  { key: 'unknown', doc_count: 1, byType: typeBuckets([['comment', 1]]) },
                ],
              },
            },
            {
              key: 'cases',
              doc_count: 2,
              bySource: {
                buckets: [{ key: 'agent', doc_count: 2, byType: typeBuckets([['comment', 2]]) }],
              },
            },
          ],
        },
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      savedObjectsClient.find
        .mockResolvedValueOnce(countsResponse)
        .mockResolvedValueOnce(bySourceResponse);
    });

    it('returns the counts and the user actions by source and type', async () => {
      const res = await getUserActionsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });

      expect(res).toEqual({
        all: {
          total: 5,
          daily: 3,
          weekly: 2,
          monthly: 1,
          maxOnACase: 1,
          bySource: [
            { source: 'agent', type: 'comment', total: 4 },
            { source: 'agent', type: 'status', total: 1 },
            { source: 'unknown', type: 'comment', total: 1 },
          ],
        },
        sec: {
          bySource: [
            { source: 'agent', type: 'comment', total: 2 },
            { source: 'agent', type: 'status', total: 1 },
            { source: 'unknown', type: 'comment', total: 1 },
          ],
        },
        obs: { bySource: [] },
        main: { bySource: [{ source: 'agent', type: 'comment', total: 2 }] },
      });
    });

    it('returns empty rows when there are no aggregations', async () => {
      savedObjectsClient.find.mockReset();
      savedObjectsClient.find
        .mockResolvedValueOnce(countsResponse)
        .mockResolvedValueOnce({ ...bySourceResponse, aggregations: undefined });

      const res = await getUserActionsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });

      expect(res.all.bySource).toEqual([]);
      expect(res.sec).toEqual({ bySource: [] });
      expect(res.obs).toEqual({ bySource: [] });
      expect(res.main).toEqual({ bySource: [] });
    });

    it('should call find with correct arguments', async () => {
      await getUserActionsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });

      expect(savedObjectsClient.find).toHaveBeenNthCalledWith(1, {
        aggs: {
          counts: {
            date_range: {
              field: 'cases-user-actions.attributes.created_at',
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
                      field: 'cases-user-actions.references.id',
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
                    'cases-user-actions.references.type': 'cases',
                  },
                },
              },
            },
            nested: {
              path: 'cases-user-actions.references',
            },
          },
        },
        filter: undefined,
        page: 0,
        perPage: 0,
        type: 'cases-user-actions',
        namespaces: ['*'],
      });

      expect(savedObjectsClient.find).toHaveBeenNthCalledWith(2, {
        aggs: {
          byOwner: {
            terms: {
              field: 'cases-user-actions.attributes.owner',
              size: 3,
              include: ['cases', 'observability', 'securitySolution'],
            },
            aggs: {
              bySource: {
                terms: {
                  field: 'cases-user-actions.attributes.source.type',
                  size: 20,
                  missing: 'unknown',
                },
                aggs: {
                  byType: {
                    terms: {
                      field: 'cases-user-actions.attributes.type',
                      size: 50,
                    },
                  },
                },
              },
            },
          },
        },
        page: 0,
        perPage: 0,
        type: 'cases-user-actions',
        namespaces: ['*'],
      });
    });
  });
});
