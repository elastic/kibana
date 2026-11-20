/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLensConfigLabel } from './visualization_label';

describe('getLensConfigLabel', () => {
  it.each([
    [
      'metric: primary metric label',
      {
        type: 'metric',
        metrics: [
          { type: 'secondary', column: 'x' },
          { type: 'primary', column: 'Total Web Requests' },
        ],
      },
      'Total Web Requests',
    ],
    [
      'metric: label wins over column',
      { type: 'metric', metrics: [{ type: 'primary', column: 'c', label: 'Unique Client IPs' }] },
      'Unique Client IPs',
    ],
    [
      'legacy_metric: single metric',
      { type: 'legacy_metric', metric: { column: 'Errors' } },
      'Errors',
    ],
    [
      'xy: first y column of the first layer',
      {
        type: 'xy',
        layers: [{ type: 'bar', x: { column: 'Request Path' }, y: [{ column: 'Request Count' }] }],
      },
      'Request Count',
    ],
    [
      'xy: x column when the layer has no y',
      { type: 'xy', layers: [{ type: 'bar', x: { column: 'Request Path' } }] },
      'Request Path',
    ],
    [
      'pie: first metric',
      { type: 'pie', metrics: [{ column: 'Bytes' }], group_by: [{ column: 'host' }] },
      'Bytes',
    ],
    ['mosaic: single metric', { type: 'mosaic', metric: { column: 'Bytes' } }, 'Bytes'],
    ['gauge: single metric', { type: 'gauge', metric: { column: 'CPU %' } }, 'CPU %'],
    ['tag_cloud: single metric', { type: 'tag_cloud', metric: { column: 'Count' } }, 'Count'],
    [
      'data_table: first metric',
      { type: 'data_table', metrics: [{ column: 'Avg bytes' }] },
      'Avg bytes',
    ],
    [
      'data_table: first row when there are no metrics',
      { type: 'data_table', rows: [{ column: 'host' }] },
      'host',
    ],
  ])('derives a label for %s', (_case, config, expected) => {
    expect(getLensConfigLabel(config)).toBe(expected);
  });

  it.each([
    ['an unknown chart type', { type: 'mystery', metrics: [{ column: 'x' }] }],
    ['a metric chart without metrics', { type: 'metric' }],
    ['an xy chart without layers', { type: 'xy', layers: [] }],
    [
      'blank labels and columns',
      { type: 'metric', metrics: [{ type: 'primary', column: '  ', label: '' }] },
    ],
  ])('returns undefined for %s', (_case, config) => {
    expect(getLensConfigLabel(config)).toBeUndefined();
  });
});
