/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateTaskOverduePercentilesForType } from './aggregate_task_overdue_percentiles_for_type';

describe('aggregateTaskOverduePercentilesForType', () => {
  test('correctly generates query, runtime_field and aggregation for determining overdue percentiles for a given type', () => {
    expect(aggregateTaskOverduePercentilesForType('foo')).toEqual({
      query: {
        bool: {
          must: [
            {
              term: {
                'task.scope': {
                  value: 'foo',
                },
              },
            },
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        {
                          term: {
                            'task.status': 'idle',
                          },
                        },
                        {
                          range: {
                            'task.runAt': {
                              lte: 'now',
                            },
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      must: [
                        {
                          bool: {
                            should: [
                              {
                                term: {
                                  'task.status': 'running',
                                },
                              },
                              {
                                term: {
                                  'task.status': 'claiming',
                                },
                              },
                            ],
                          },
                        },
                        {
                          range: {
                            'task.retryAt': {
                              lte: 'now',
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      runtime_mappings: {
        overdueBy: {
          type: 'long',
          script: {
            source: `
            def runAt = doc['task.runAt'];
            if(!runAt.empty) {
              emit(new Date().getTime() - runAt.value.getMillis());
            } else {
              def retryAt = doc['task.retryAt'];
              if(!retryAt.empty) {
                emit(new Date().getTime() - retryAt.value.getMillis());
              } else {
                emit(0);
              }
            }
          `,
          },
        },
      },
      aggs: {
        overdueByPercentiles: {
          percentiles: {
            field: 'overdueBy',
            percents: [50, 99],
          },
        },
      },
    });
  });
});
