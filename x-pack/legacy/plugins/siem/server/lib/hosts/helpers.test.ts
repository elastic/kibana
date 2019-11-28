/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggregationRequest } from '../types';

import { buildFieldsTermAggregation } from './helpers';

describe('#buildFieldsTermAggregation', () => {
  test('it convert fields to aggregation terms', () => {
    const fields: readonly string[] = [
      'host.architecture',
      'host.id',
      'host.name',
      'host.os.family',
      'host.os.name',
    ];
    const expected: AggregationRequest = {
      host_architecture: {
        terms: {
          field: 'host.architecture',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_id: {
        terms: {
          field: 'host.id',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_name: {
        terms: {
          field: 'host.name',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_os_family: {
        terms: {
          field: 'host.os.family',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      host_os_name: {
        terms: {
          field: 'host.os.name',
          size: 10,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
    };
    expect(buildFieldsTermAggregation(fields)).toEqual(expected);
  });
});
