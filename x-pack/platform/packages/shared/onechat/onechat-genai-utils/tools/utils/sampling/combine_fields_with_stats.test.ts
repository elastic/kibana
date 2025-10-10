/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingField } from '../mappings';
import type { SamplingStats } from './create_stats_from_samples';
import { combineFieldsWithStats } from './combine_fields_with_stats';

describe('combineFieldsWithStats', () => {
  it('combines a field with its stats', () => {
    const field: MappingField = {
      path: 'my.field',
      type: 'text',
      meta: {},
    };
    const stats: SamplingStats = {
      sampleCount: 5,
      fieldStats: {
        'my.field': {
          filledDocCount: 5,
          emptyDocCount: 0,
          values: [{ value: 'some text', count: 5 }],
        },
      },
    };

    const combined = combineFieldsWithStats({ fields: [field], stats });

    expect(combined).toEqual([
      {
        path: 'my.field',
        type: 'text',
        meta: {},
        stats: {
          emptyDocCount: 0,
          filledDocCount: 5,
          values: [
            {
              count: 5,
              value: 'some text',
            },
          ],
        },
      },
    ]);
  });

  it('creates empty stats when the field is not present', () => {
    const field: MappingField = {
      path: 'my.field',
      type: 'text',
      meta: {},
    };
    const stats: SamplingStats = {
      sampleCount: 1,
      fieldStats: {},
    };

    const combined = combineFieldsWithStats({ fields: [field], stats });

    expect(combined).toEqual([
      {
        path: 'my.field',
        type: 'text',
        meta: {},
        stats: {
          emptyDocCount: 1,
          filledDocCount: 0,
          values: [],
        },
      },
    ]);
  });
});
