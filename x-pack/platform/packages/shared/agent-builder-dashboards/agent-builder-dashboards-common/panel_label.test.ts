/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { findPanelById, getPanelLabel } from './panel_label';

const grid = { x: 0, y: 0, w: 24, h: 15 };
const lens = (config: Record<string, unknown>) => ({ type: LENS_EMBEDDABLE_TYPE, config });

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
