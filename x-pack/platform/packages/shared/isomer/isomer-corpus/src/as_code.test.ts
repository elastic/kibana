/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenAsCodePanels, getVisualizationRefId, withoutVolatileMeta } from './as_code';

describe('flattenAsCodePanels', () => {
  it('returns top-level and section panels in API order, with their section', () => {
    const panels = flattenAsCodePanels([
      { id: 'a', type: 'vis', grid: { x: 0, y: 0, w: 12, h: 6 }, config: { type: 'metric' } },
      {
        id: 'section-1',
        title: 'Open section',
        collapsed: false,
        grid: { y: 6 },
        panels: [{ id: 'b', type: 'markdown', grid: { x: 0, y: 0 }, config: { content: '#' } }],
      },
      {
        id: 'section-2',
        title: 'Closed section',
        collapsed: true,
        grid: { y: 12 },
        panels: [{ id: 'c', type: 'vis', grid: { x: 0, y: 0 }, config: { ref_id: 'lens-1' } }],
      },
    ]);

    expect(
      panels.map(({ id, sectionId, inCollapsedSection }) => [id, sectionId, inCollapsedSection])
    ).toEqual([
      ['a', undefined, false],
      ['b', 'section-1', false],
      ['c', 'section-2', true],
    ]);
  });

  it('accepts a dashboard without panels', () => {
    expect(flattenAsCodePanels(undefined)).toEqual([]);
  });
});

describe('getVisualizationRefId', () => {
  it('returns the reference of a by-reference Lens panel', () => {
    const [panel] = flattenAsCodePanels([{ id: 'a', type: 'vis', config: { ref_id: 'lens-1' } }]);
    expect(getVisualizationRefId(panel)).toBe('lens-1');
  });

  it('ignores by-value Lens panels and other panel types', () => {
    const panels = flattenAsCodePanels([
      { id: 'a', type: 'vis', config: { type: 'metric' } },
      { id: 'b', type: 'search', config: { ref_id: 'search-1' } },
    ]);
    expect(panels.map(getVisualizationRefId)).toEqual([undefined, undefined]);
  });
});

describe('withoutVolatileMeta', () => {
  it('drops write bookkeeping and keeps the rest', () => {
    expect(
      withoutVolatileMeta({
        id: 'a',
        data: { title: 'A' },
        meta: { created_at: 'x', updated_at: 'y', version: 'z', managed: false },
      })
    ).toEqual({ id: 'a', data: { title: 'A' }, meta: { managed: false } });
  });

  it('keeps a response without meta', () => {
    const response: { id: string; meta?: Record<string, unknown> } = { id: 'a' };
    expect(withoutVolatileMeta(response)).toEqual({ id: 'a' });
  });
});
