/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartVisualizationAttachmentData } from './visualization_types';
import { getLensConfigLabel, getVisualizationLabel } from './visualization_label';

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

describe('getVisualizationLabel', () => {
  const metric = { type: 'metric', metrics: [{ type: 'primary', column: 'Total' }] };
  const lens = (
    visualization: Record<string, unknown>,
    esql = 'FROM logs | STATS Total = COUNT(*)'
  ): ChartVisualizationAttachmentData => ({ query: 'total logs', visualization, esql });

  it('prefers the title', () => {
    expect(getVisualizationLabel(lens({ ...metric, title: 'Requests' }))).toBe('Requests');
  });

  it('uses the Lens measure when untitled, with or without an explicit renderer', () => {
    expect(getVisualizationLabel(lens(metric))).toBe('Total');
    expect(getVisualizationLabel({ ...lens(metric), renderer: 'lens' })).toBe('Total');
  });

  it('falls back to the ES|QL query when there is no title or measure', () => {
    expect(getVisualizationLabel(lens({ type: 'mystery' }))).toBe(
      'FROM logs | STATS Total = COUNT(*)'
    );
    expect(getVisualizationLabel({ ...lens(metric), renderer: 'vega' })).toBe(
      'FROM logs | STATS Total = COUNT(*)'
    );
  });

  it('puts the query on one line and truncates it at a character boundary', () => {
    const label = getVisualizationLabel(
      lens({ type: 'mystery' }, `FROM logs\n| WHERE message == "${'😀'.repeat(60)}"`)
    );
    expect(Array.from(label ?? '')).toHaveLength(50);
    expect(label).toMatch(/^FROM logs \| WHERE message == "(😀)+…$/u);
  });

  it('returns undefined for untitled static custom content', () => {
    expect(
      getVisualizationLabel({
        query: 'a note',
        renderer: 'custom_content',
        visualization: { template: '<p>Hi</p>' },
      })
    ).toBeUndefined();
  });
});
