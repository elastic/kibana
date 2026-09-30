/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { findPanelById, getLensConfigLabel, getPanelLabel } from './panel_label';

const grid = { x: 0, y: 0, w: 24, h: 15 };
const lens = (config: Record<string, unknown>) => ({ type: LENS_EMBEDDABLE_TYPE, config });

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
    ['gauge: single metric', { type: 'gauge', metric: { column: 'CPU %' } }, 'CPU %'],
    ['tagcloud: single metric', { type: 'tagcloud', metric: { column: 'Count' } }, 'Count'],
    [
      'datatable: first metric',
      { type: 'datatable', metrics: [{ column: 'Avg bytes' }] },
      'Avg bytes',
    ],
    [
      'datatable: first column when there are no metrics',
      { type: 'datatable', columns: [{ column: 'host' }] },
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

describe('getPanelLabel', () => {
  it('prefers the panel title', () => {
    expect(
      getPanelLabel(
        lens({ title: 'Requests', type: 'metric', metrics: [{ type: 'primary', column: 'c' }] })
      )
    ).toBe('Requests');
  });

  it('falls back to the chart-derived label for untitled Lens panels', () => {
    expect(
      getPanelLabel(lens({ type: 'metric', metrics: [{ type: 'primary', column: 'Total' }] }))
    ).toBe('Total');
  });

  it('returns undefined for untitled panels of other types', () => {
    expect(getPanelLabel({ type: 'custom_content', config: { template: '<p/>' } })).toBeUndefined();
    expect(getPanelLabel({ type: 'markdown', config: { content: 'x' } })).toBeUndefined();
  });
});

describe('findPanelById', () => {
  const panel = { type: LENS_EMBEDDABLE_TYPE, id: 'panel-1', grid, config: {} };
  const nested = { type: LENS_EMBEDDABLE_TYPE, id: 'panel-2', grid, config: {} };
  const section = {
    id: 'section-1',
    title: 'Section',
    collapsed: false,
    grid: { y: 15 },
    panels: [nested],
  };

  it('finds top-level and nested panels', () => {
    expect(findPanelById([panel, section], 'panel-1')).toBe(panel);
    expect(findPanelById([panel, section], 'panel-2')).toBe(nested);
    expect(findPanelById([panel, section], 'missing')).toBeUndefined();
  });
});
