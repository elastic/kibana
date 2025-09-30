/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatsFromSamples } from './create_stats_from_samples';
import type { SampleDoc } from './get_sample_docs';

const createSample = (values: Record<string, Array<string | number | boolean>>): SampleDoc => {
  return {
    index: 'index',
    id: 'id',
    values,
  };
};

describe('createStatsFromSamples', () => {
  it('creates stats based on the provided samples', () => {
    const samples = [
      createSample({
        foo: ['doc-1'],
        hello: ['dolly'],
      }),
      createSample({
        foo: ['doc-2'],
        bar: [42],
      }),
    ];

    const stats = createStatsFromSamples({ samples });

    expect(stats.sampleCount).toEqual(2);
    expect(stats.fieldStats).toEqual({
      bar: {
        emptyDocCount: 1,
        filledDocCount: 1,
        values: [
          {
            count: 1,
            value: 42,
          },
        ],
      },
      foo: {
        emptyDocCount: 0,
        filledDocCount: 2,
        values: [
          {
            count: 1,
            value: 'doc-1',
          },
          {
            count: 1,
            value: 'doc-2',
          },
        ],
      },
      hello: {
        emptyDocCount: 1,
        filledDocCount: 1,
        values: [
          {
            count: 1,
            value: 'dolly',
          },
        ],
      },
    });
  });

  it('sorts values by occurrences', () => {
    const samples = [
      createSample({
        foo: ['value-1', 'value-2', 'value-3'],
      }),
      createSample({
        foo: ['value-3', 'value-2'],
      }),
      createSample({
        foo: ['value-2'],
      }),
    ];

    const stats = createStatsFromSamples({ samples });

    expect(stats.fieldStats).toEqual({
      foo: {
        emptyDocCount: 0,
        filledDocCount: 3,
        values: [
          {
            value: 'value-2',
            count: 3,
          },
          {
            value: 'value-3',
            count: 2,
          },
          {
            value: 'value-1',
            count: 1,
          },
        ],
      },
    });
  });
});
