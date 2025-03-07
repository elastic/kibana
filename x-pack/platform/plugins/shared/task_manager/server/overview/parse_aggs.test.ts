/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAggs } from './parse_aggs';

describe('parseAggs', () => {
  test('should format response as expected', () => {
    expect(
      parseAggs(
        {
          serverUuid: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '5b2de169-2785-441b-ae8c-186a1936b17d',
                doc_count: 310,
                outcome: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    { key: 'success', doc_count: 307 },
                    { key: 'failure', doc_count: 3 },
                  ],
                },
                metrics: {
                  buckets: [
                    {
                      key_as_string: '2025-02-25T19:35:30.000Z',
                      key: 1740512130000,
                      doc_count: 11,
                      maxLoad: { value: 100 },
                      maxDuration: { value: 2233 },
                      avgLoad: { value: 38.18181818181818 },
                      avgDuration: { value: 263.8 },
                    },
                    {
                      key_as_string: '2025-02-25T19:35:40.000Z',
                      key: 1740512140000,
                      doc_count: 3,
                      maxLoad: { value: 0 },
                      maxDuration: { value: 25 },
                      avgLoad: { value: 0 },
                      avgDuration: { value: 24.666666666666668 },
                    },
                    {
                      key_as_string: '2025-02-25T19:35:50.000Z',
                      key: 1740512150000,
                      doc_count: 4,
                      maxLoad: { value: 0 },
                      maxDuration: { value: 36 },
                      avgLoad: { value: 0 },
                      avgDuration: { value: 22 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:00.000Z',
                      key: 1740512160000,
                      doc_count: 3,
                      maxLoad: { value: 0 },
                      maxDuration: { value: 62 },
                      avgLoad: { value: 0 },
                      avgDuration: { value: 46.666666666666664 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:10.000Z',
                      key: 1740512170000,
                      doc_count: 3,
                      maxLoad: { value: 0 },
                      maxDuration: { value: 34 },
                      avgLoad: { value: 0 },
                      avgDuration: { value: 22.666666666666668 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:20.000Z',
                      key: 1740512180000,
                      doc_count: 4,
                      maxLoad: { value: 20 },
                      maxDuration: { value: 77 },
                      avgLoad: { value: 5 },
                      avgDuration: { value: 36.5 },
                    },
                  ],
                },
              },
              {
                key: 'af7f16b1-8882-43fe-9942-c690b0a6da1d',
                doc_count: 300,
                outcome: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    { key: 'success', doc_count: 250 },
                    { key: 'failure', doc_count: 50 },
                  ],
                },
                metrics: {
                  buckets: [
                    {
                      key_as_string: '2025-02-25T19:35:30.000Z',
                      key: 1740512130000,
                      doc_count: 3,
                      maxLoad: { value: 20 },
                      maxDuration: { value: 54 },
                      avgLoad: { value: 16 },
                      avgDuration: { value: 34 },
                    },
                    {
                      key_as_string: '2025-02-25T19:35:40.000Z',
                      key: 1740512140000,
                      doc_count: 3,
                      maxLoad: { value: 60 },
                      maxDuration: { value: 78 },
                      avgLoad: { value: 44 },
                      avgDuration: { value: 30 },
                    },
                    {
                      key_as_string: '2025-02-25T19:35:50.000Z',
                      key: 1740512150000,
                      doc_count: 2,
                      maxLoad: { value: 80 },
                      maxDuration: { value: 120 },
                      avgLoad: { value: 10 },
                      avgDuration: { value: 33 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:00.000Z',
                      key: 1740512160000,
                      doc_count: 3,
                      maxLoad: { value: 30 },
                      maxDuration: { value: 99 },
                      avgLoad: { value: 10 },
                      avgDuration: { value: 77 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:10.000Z',
                      key: 1740512170000,
                      doc_count: 5,
                      maxLoad: { value: 0 },
                      maxDuration: { value: 44 },
                      avgLoad: { value: 0 },
                      avgDuration: { value: 12 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:20.000Z',
                      key: 1740512180000,
                      doc_count: 1,
                      maxLoad: { value: 10 },
                      maxDuration: { value: 20 },
                      avgLoad: { value: 10 },
                      avgDuration: { value: 20 },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          serverUuid: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '5b2de169-2785-441b-ae8c-186a1936b17d',
                doc_count: 51,
                outcome: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    { key: 'success', doc_count: 48 },
                    { key: 'failure', doc_count: 3 },
                  ],
                },
                type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 6,
                  buckets: [
                    {
                      key: 'Fleet-Metrics-Task',
                      doc_count: 8,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 8 }],
                      },
                    },
                    {
                      key: 'endpoint:complete-external-response-actions',
                      doc_count: 8,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 8 }],
                      },
                    },
                    {
                      key: 'endpoint:user-artifact-packager',
                      doc_count: 8,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 8 }],
                      },
                    },
                    {
                      key: 'task_manager:delete_inactive_background_task_nodes',
                      doc_count: 8,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 8 }],
                      },
                    },
                    {
                      key: 'alerting_health_check',
                      doc_count: 2,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 2 }],
                      },
                    },
                    {
                      key: 'alerts_invalidate_api_keys',
                      doc_count: 2,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 2 }],
                      },
                    },
                    {
                      key: 'fleet:sync-integrations-task',
                      doc_count: 2,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 2 }],
                      },
                    },
                    {
                      key: 'security:endpoint-diagnostics',
                      doc_count: 2,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'failure', doc_count: 2 }],
                      },
                    },
                    {
                      key: 'Fleet-Usage-Logger',
                      doc_count: 1,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 1 }],
                      },
                    },
                    {
                      key: 'ML:saved-objects-sync',
                      doc_count: 1,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'failure', doc_count: 1 }],
                      },
                    },
                  ],
                },
                metrics: {
                  buckets: [
                    {
                      key_as_string: '2025-02-25T19:35:30.000Z',
                      key: 1740512130000,
                      doc_count: 10,
                      maxScheduleDelay: { value: 454572 },
                      avgScheduleDelay: { value: 241208.3 },
                      maxEventLoop: { value: 152 },
                      maxDuration: { value: 630 },
                      avgDuration: { value: 262.2 },
                    },
                    {
                      key_as_string: '2025-02-25T19:35:40.000Z',
                      key: 1740512140000,
                      doc_count: 4,
                      maxScheduleDelay: { value: 214574 },
                      avgScheduleDelay: { value: 54540.25 },
                      maxEventLoop: { value: 152 },
                      maxDuration: { value: 1272 },
                      avgDuration: { value: 376 },
                    },
                    {
                      key_as_string: '2025-02-25T19:35:50.000Z',
                      key: 1740512150000,
                      doc_count: 3,
                      maxScheduleDelay: { value: 1110 },
                      avgScheduleDelay: { value: 844.6666666666666 },
                      maxEventLoop: { value: 14 },
                      maxDuration: { value: 39 },
                      avgDuration: { value: 33.666666666666664 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:00.000Z',
                      key: 1740512160000,
                      doc_count: 1,
                      maxScheduleDelay: { value: 2770 },
                      avgScheduleDelay: { value: 2770 },
                      maxEventLoop: { value: 11 },
                      maxDuration: { value: 22 },
                      avgDuration: { value: 22 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:10.000Z',
                      key: 1740512170000,
                      doc_count: 1,
                      maxScheduleDelay: { value: 2844 },
                      avgScheduleDelay: { value: 2844 },
                      maxEventLoop: { value: 0 },
                      maxDuration: { value: 18 },
                      avgDuration: { value: 18 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:20.000Z',
                      key: 1740512180000,
                      doc_count: 2,
                      maxScheduleDelay: { value: 1092 },
                      avgScheduleDelay: { value: 1091.5 },
                      maxEventLoop: { value: 0 },
                      maxDuration: { value: 13 },
                      avgDuration: { value: 12 },
                    },
                  ],
                },
                errors: {
                  buckets: [
                    {
                      doc_count: 38,
                      key: 'fail fail fail',
                      regex: '.*?fail.+?fail.+?fail.*?',
                      max_matching_length: 15,
                      taskType: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [
                          {
                            key: 'alerting:example.always-firing',
                            doc_count: 38,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                key: 'af7f16b1-8882-43fe-9942-c690b0a6da1d',
                doc_count: 34,
                outcome: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [{ key: 'success', doc_count: 34 }],
                },
                type: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 6,
                  buckets: [
                    {
                      key: 'Fleet-Metrics-Task',
                      doc_count: 8,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 8 }],
                      },
                    },
                    {
                      key: 'endpoint:user-artifact-packager',
                      doc_count: 8,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 8 }],
                      },
                    },
                    {
                      key: 'task_manager:delete_inactive_background_task_nodes',
                      doc_count: 8,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 8 }],
                      },
                    },
                    {
                      key: 'alerting_health_check',
                      doc_count: 2,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 2 }],
                      },
                    },
                    {
                      key: 'alerts_invalidate_api_keys',
                      doc_count: 2,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 2 }],
                      },
                    },
                    {
                      key: 'fleet:sync-integrations-task',
                      doc_count: 2,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 2 }],
                      },
                    },
                    {
                      key: 'security:endpoint-diagnostics',
                      doc_count: 2,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 2 }],
                      },
                    },
                    {
                      key: 'Fleet-Usage-Logger',
                      doc_count: 1,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 1 }],
                      },
                    },
                    {
                      key: 'ML:saved-objects-sync',
                      doc_count: 1,
                      outcome: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [{ key: 'success', doc_count: 1 }],
                      },
                    },
                  ],
                },
                metrics: {
                  buckets: [
                    {
                      key_as_string: '2025-02-25T19:35:30.000Z',
                      key: 1740512130000,
                      doc_count: 10,
                      maxScheduleDelay: { value: 2453 },
                      avgScheduleDelay: { value: 1532 },
                      maxEventLoop: { value: 99 },
                      maxDuration: { value: 630 },
                      avgDuration: { value: 262.2 },
                    },
                    {
                      key_as_string: '2025-02-25T19:35:40.000Z',
                      key: 1740512140000,
                      doc_count: 4,
                      maxScheduleDelay: { value: 214574 },
                      avgScheduleDelay: { value: 54540.25 },
                      maxEventLoop: { value: 152 },
                      maxDuration: { value: 1272 },
                      avgDuration: { value: 376 },
                    },
                    {
                      key_as_string: '2025-02-25T19:35:50.000Z',
                      key: 1740512150000,
                      doc_count: 3,
                      maxScheduleDelay: { value: 1110 },
                      avgScheduleDelay: { value: 844.6666666666666 },
                      maxEventLoop: { value: 14 },
                      maxDuration: { value: 39 },
                      avgDuration: { value: 33.666666666666664 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:00.000Z',
                      key: 1740512160000,
                      doc_count: 1,
                      maxScheduleDelay: { value: 2770 },
                      avgScheduleDelay: { value: 2770 },
                      maxEventLoop: { value: 11 },
                      maxDuration: { value: 22 },
                      avgDuration: { value: 22 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:10.000Z',
                      key: 1740512170000,
                      doc_count: 1,
                      maxScheduleDelay: { value: 2844 },
                      avgScheduleDelay: { value: 2844 },
                      maxEventLoop: { value: 0 },
                      maxDuration: { value: 18 },
                      avgDuration: { value: 18 },
                    },
                    {
                      key_as_string: '2025-02-25T19:36:20.000Z',
                      key: 1740512180000,
                      doc_count: 2,
                      maxScheduleDelay: { value: 1092 },
                      avgScheduleDelay: { value: 1091.5 },
                      maxEventLoop: { value: 0 },
                      maxDuration: { value: 13 },
                      avgDuration: { value: 12 },
                    },
                  ],
                },
                errors: {
                  buckets: [
                    {
                      doc_count: 21,
                      key: 'fail fail fail',
                      regex: '.*?fail.+?fail.+?fail.*?',
                      max_matching_length: 15,
                      taskType: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [
                          {
                            key: 'alerting:example.always-firing',
                            doc_count: 21,
                          },
                        ],
                      },
                    },
                    {
                      doc_count: 12,
                      key: 'something went wrong',
                      regex: '.*?something.+?went.+?wrong.*?',
                      max_matching_length: 15,
                      taskType: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [
                          {
                            key: 'test.ruleType1',
                            doc_count: 3,
                          },
                          {
                            key: 'test.ruleType2',
                            doc_count: 9,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      )
    ).toEqual([
      {
        serverUuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        claim: {
          success: 307,
          failure: 3,
          total: 310,
          metrics: [
            {
              key: 1740512130000,
              count: 11,
              maxDuration: 2233,
              avgDuration: 263.8,
              maxLoad: 100,
              avgLoad: 38.18181818181818,
            },
            {
              key: 1740512140000,
              count: 3,
              maxDuration: 25,
              avgDuration: 24.666666666666668,
              maxLoad: 0,
              avgLoad: 0,
            },
            {
              key: 1740512150000,
              count: 4,
              maxDuration: 36,
              avgDuration: 22,
              maxLoad: 0,
              avgLoad: 0,
            },
            {
              key: 1740512160000,
              count: 3,
              maxDuration: 62,
              avgDuration: 46.666666666666664,
              maxLoad: 0,
              avgLoad: 0,
            },
            {
              key: 1740512170000,
              count: 3,
              maxDuration: 34,
              avgDuration: 22.666666666666668,
              maxLoad: 0,
              avgLoad: 0,
            },
            {
              key: 1740512180000,
              count: 4,
              maxDuration: 77,
              avgDuration: 36.5,
              maxLoad: 20,
              avgLoad: 5,
            },
          ],
        },
        run: {
          success: 48,
          failure: 3,
          total: 51,
          by_task_type: {
            'Fleet-Metrics-Task': { success: 8, failure: 0, total: 8 },
            'endpoint:complete-external-response-actions': { success: 8, failure: 0, total: 8 },
            'endpoint:user-artifact-packager': { success: 8, failure: 0, total: 8 },
            'task_manager:delete_inactive_background_task_nodes': {
              success: 8,
              failure: 0,
              total: 8,
            },
            alerting_health_check: { success: 2, failure: 0, total: 2 },
            alerts_invalidate_api_keys: { success: 2, failure: 0, total: 2 },
            'fleet:sync-integrations-task': { success: 2, failure: 0, total: 2 },
            'security:endpoint-diagnostics': { success: 0, failure: 2, total: 2 },
            'Fleet-Usage-Logger': { success: 1, failure: 0, total: 1 },
            'ML:saved-objects-sync': { success: 0, failure: 1, total: 1 },
          },
          metrics: [
            {
              key: 1740512130000,
              count: 10,
              maxDuration: 630,
              avgDuration: 262.2,
              maxScheduleDelay: 454572,
              avgScheduleDelay: 241208.3,
              maxEventLoop: 152,
            },
            {
              key: 1740512140000,
              count: 4,
              maxDuration: 1272,
              avgDuration: 376,
              maxScheduleDelay: 214574,
              avgScheduleDelay: 54540.25,
              maxEventLoop: 152,
            },
            {
              key: 1740512150000,
              count: 3,
              maxDuration: 39,
              avgDuration: 33.666666666666664,
              maxScheduleDelay: 1110,
              avgScheduleDelay: 844.6666666666666,
              maxEventLoop: 14,
            },
            {
              key: 1740512160000,
              count: 1,
              maxDuration: 22,
              avgDuration: 22,
              maxScheduleDelay: 2770,
              avgScheduleDelay: 2770,
              maxEventLoop: 11,
            },
            {
              key: 1740512170000,
              count: 1,
              maxDuration: 18,
              avgDuration: 18,
              maxScheduleDelay: 2844,
              avgScheduleDelay: 2844,
              maxEventLoop: 0,
            },
            {
              key: 1740512180000,
              count: 2,
              maxDuration: 13,
              avgDuration: 12,
              maxScheduleDelay: 1092,
              avgScheduleDelay: 1091.5,
              maxEventLoop: 0,
            },
          ],
          errors: [
            {
              message: 'fail fail fail',
              byTaskType: [
                {
                  count: 38,
                  type: 'alerting:example.always-firing',
                },
              ],
            },
          ],
        },
      },
      {
        serverUuid: 'af7f16b1-8882-43fe-9942-c690b0a6da1d',
        claim: {
          success: 250,
          failure: 50,
          total: 300,
          metrics: [
            {
              key: 1740512130000,
              count: 3,
              maxDuration: 54,
              avgDuration: 34,
              maxLoad: 20,
              avgLoad: 16,
            },
            {
              key: 1740512140000,
              count: 3,
              maxDuration: 78,
              avgDuration: 30,
              maxLoad: 60,
              avgLoad: 44,
            },
            {
              key: 1740512150000,
              count: 2,
              maxDuration: 120,
              avgDuration: 33,
              maxLoad: 80,
              avgLoad: 10,
            },
            {
              key: 1740512160000,
              count: 3,
              maxDuration: 99,
              avgDuration: 77,
              maxLoad: 30,
              avgLoad: 10,
            },
            {
              key: 1740512170000,
              count: 5,
              maxDuration: 44,
              avgDuration: 12,
              maxLoad: 0,
              avgLoad: 0,
            },
            {
              key: 1740512180000,
              count: 1,
              maxDuration: 20,
              avgDuration: 20,
              maxLoad: 10,
              avgLoad: 10,
            },
          ],
        },
        run: {
          success: 34,
          failure: 0,
          total: 34,
          by_task_type: {
            'Fleet-Metrics-Task': { success: 8, failure: 0, total: 8 },
            'endpoint:user-artifact-packager': { success: 8, failure: 0, total: 8 },
            'task_manager:delete_inactive_background_task_nodes': {
              success: 8,
              failure: 0,
              total: 8,
            },
            alerting_health_check: { success: 2, failure: 0, total: 2 },
            alerts_invalidate_api_keys: { success: 2, failure: 0, total: 2 },
            'fleet:sync-integrations-task': { success: 2, failure: 0, total: 2 },
            'security:endpoint-diagnostics': { success: 2, failure: 0, total: 2 },
            'Fleet-Usage-Logger': { success: 1, failure: 0, total: 1 },
            'ML:saved-objects-sync': { success: 1, failure: 0, total: 1 },
          },
          metrics: [
            {
              key: 1740512130000,
              count: 10,
              maxDuration: 630,
              avgDuration: 262.2,
              maxScheduleDelay: 2453,
              avgScheduleDelay: 1532,
              maxEventLoop: 99,
            },
            {
              key: 1740512140000,
              count: 4,
              maxDuration: 1272,
              avgDuration: 376,
              maxScheduleDelay: 214574,
              avgScheduleDelay: 54540.25,
              maxEventLoop: 152,
            },
            {
              key: 1740512150000,
              count: 3,
              maxDuration: 39,
              avgDuration: 33.666666666666664,
              maxScheduleDelay: 1110,
              avgScheduleDelay: 844.6666666666666,
              maxEventLoop: 14,
            },
            {
              key: 1740512160000,
              count: 1,
              maxDuration: 22,
              avgDuration: 22,
              maxScheduleDelay: 2770,
              avgScheduleDelay: 2770,
              maxEventLoop: 11,
            },
            {
              key: 1740512170000,
              count: 1,
              maxDuration: 18,
              avgDuration: 18,
              maxScheduleDelay: 2844,
              avgScheduleDelay: 2844,
              maxEventLoop: 0,
            },
            {
              key: 1740512180000,
              count: 2,
              maxDuration: 13,
              avgDuration: 12,
              maxScheduleDelay: 1092,
              avgScheduleDelay: 1091.5,
              maxEventLoop: 0,
            },
          ],
          errors: [
            {
              message: 'fail fail fail',
              byTaskType: [
                {
                  count: 21,
                  type: 'alerting:example.always-firing',
                },
              ],
            },
            {
              message: 'something went wrong',
              byTaskType: [
                {
                  count: 3,
                  type: 'test.ruleType1',
                },
                {
                  count: 9,
                  type: 'test.ruleType2',
                },
              ],
            },
          ],
        },
      },
    ]);
  });
});
