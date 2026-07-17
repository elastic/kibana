/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getAlertsTelemetryData } from './alerts';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

describe('alerts', () => {
  const logger = loggingSystemMock.createLogger();

  describe('getAlertsTelemetryData', () => {
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

    const legacyResponse = {
      total: 3,
      saved_objects: [],
      per_page: 1,
      page: 1,
      aggregations: {
        by_owner: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'cases',
              doc_count: 4,
              counts: {
                buckets: [
                  {
                    doc_count: 4,
                    topAlertsPerBucket: { value: 4 },
                  },
                  {
                    doc_count: 4,
                    topAlertsPerBucket: { value: 4 },
                  },
                  {
                    doc_count: 4,
                    topAlertsPerBucket: { value: 4 },
                  },
                ],
              },
              uniqueAlertCommentsCount: {
                value: 4,
              },
              references: {
                cases: {
                  max: {
                    value: 2,
                  },
                },
              },
            },
            {
              key: 'securitySolution',
              doc_count: 4,
              counts: {
                buckets: [
                  {
                    doc_count: 4,
                    topAlertsPerBucket: { value: 4 },
                  },
                  {
                    doc_count: 4,
                    topAlertsPerBucket: { value: 4 },
                  },
                  {
                    doc_count: 4,
                    topAlertsPerBucket: { value: 4 },
                  },
                ],
              },
              uniqueAlertCommentsCount: {
                value: 4,
              },
              references: {
                cases: {
                  max: {
                    value: 1,
                  },
                },
              },
            },
            {
              key: 'observability',
              doc_count: 4,
              counts: {
                buckets: [
                  {
                    doc_count: 4,
                    topAlertsPerBucket: { value: 4 },
                  },
                  {
                    doc_count: 4,
                    topAlertsPerBucket: { value: 4 },
                  },
                  {
                    doc_count: 4,
                    topAlertsPerBucket: { value: 4 },
                  },
                ],
              },
              uniqueAlertCommentsCount: {
                value: 4,
              },
            },
          ],
        },
      },
    };

    // Unified alerts (cases-attachments) query returns nothing here; the merge
    // adds 0, so expectations below reflect the legacy (cases-comments) query.
    const emptyUnifiedResponse = {
      total: 0,
      saved_objects: [],
      per_page: 0,
      page: 0,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      savedObjectsClient.find
        .mockResolvedValueOnce(legacyResponse)
        .mockResolvedValueOnce(emptyUnifiedResponse);
    });

    it('it returns the correct res', async () => {
      const res = await getAlertsTelemetryData({
        savedObjectsClient: telemetrySavedObjectsClient,
        logger,
      });

      expect(res).toEqual({
        all: {
          total: 12,
          daily: 12,
          weekly: 12,
          monthly: 12,
          maxOnACase: 2,
        },
        obs: {
          total: 4,
          daily: 4,
          weekly: 4,
          monthly: 4,
          maxOnACase: 0,
        },
        sec: {
          total: 4,
          daily: 4,
          weekly: 4,
          monthly: 4,
          maxOnACase: 1,
        },
        main: {
          total: 4,
          daily: 4,
          weekly: 4,
          monthly: 4,
          maxOnACase: 2,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      await getAlertsTelemetryData({ savedObjectsClient: telemetrySavedObjectsClient, logger });
      expect(savedObjectsClient.find).toBeCalledWith({
        aggs: {
          by_owner: {
            aggs: {
              counts: {
                date_range: {
                  field: 'cases-comments.attributes.created_at',
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
                aggregations: {
                  topAlertsPerBucket: {
                    cardinality: {
                      field: 'cases-comments.attributes.alertId',
                    },
                  },
                },
              },
              references: {
                aggregations: {
                  cases: {
                    aggregations: {
                      ids: {
                        terms: {
                          field: 'cases-comments.references.id',
                        },
                        aggregations: {
                          reverse: {
                            reverse_nested: {},
                            aggregations: {
                              topAlerts: {
                                cardinality: {
                                  field: 'cases-comments.attributes.alertId',
                                },
                              },
                            },
                          },
                        },
                      },
                      max: {
                        max_bucket: {
                          buckets_path: 'ids>reverse.topAlerts',
                        },
                      },
                    },
                    filter: {
                      term: {
                        'cases-comments.references.type': 'cases',
                      },
                    },
                  },
                },
                nested: {
                  path: 'cases-comments.references',
                },
              },
              uniqueAlertCommentsCount: {
                cardinality: {
                  field: 'cases-comments.attributes.alertId',
                },
              },
            },
            terms: {
              field: 'cases-comments.attributes.owner',
              include: ['securitySolution', 'observability', 'cases'],
              size: 3,
            },
          },
        },
        filter: {
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
        },
        page: 0,
        perPage: 0,
        type: 'cases-comments',
        namespaces: ['*'],
      });
    });

    it('also queries unified alerts in cases-attachments', async () => {
      await getAlertsTelemetryData({ savedObjectsClient: telemetrySavedObjectsClient, logger });

      const unifiedCall = savedObjectsClient.find.mock.calls.find(
        ([args]) => args.type === 'cases-attachments'
      );

      expect(unifiedCall).toBeDefined();
      const [unifiedArgs] = unifiedCall!;
      expect(unifiedArgs.aggs).toMatchObject({
        by_owner: {
          terms: { field: 'cases-attachments.attributes.owner' },
          aggs: {
            uniqueAlertCommentsCount: {
              cardinality: { field: 'cases-attachments.attributes.attachmentId' },
            },
          },
        },
      });
      expect(unifiedArgs.filter).toMatchObject({
        arguments: expect.arrayContaining([
          expect.objectContaining({
            arguments: expect.arrayContaining([
              expect.objectContaining({ value: 'cases-attachments.attributes.type' }),
              expect.objectContaining({ value: 'security.alert' }),
            ]),
          }),
        ]),
      });
    });
  });
});
