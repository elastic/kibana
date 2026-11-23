/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFocusViewport } from './get_focus_viewport';

const base = {
  nodeWidth: 100,
  nodeHeight: 50,
  canvasWidth: 1000,
  canvasHeight: 500,
  minZoom: 0.1,
  maxZoom: 1.2,
};

const nodes = [
  { id: 'a', position: { x: 0, y: 0 } },
  { id: 'b', position: { x: 900, y: 0 } },
  { id: 'far', position: { x: 5000, y: 5000 } },
];

describe('getFocusViewport', () => {
  it('centers the focused node and caps the zoom when nothing else is visible', () => {
    expect(getFocusViewport({ ...base, nodes, focusId: 'a', visibleIds: new Set(['a']) })).toEqual({
      centerX: 50,
      centerY: 25,
      zoom: 1.2,
    });
  });

  it('keeps the node centered and zooms out to include its neighbors', () => {
    const viewport = getFocusViewport({
      ...base,
      nodes,
      focusId: 'a',
      visibleIds: new Set(['a', 'b']),
    });

    expect(viewport?.centerX).toBe(50);
    // Farthest edge is 900 + 50 from the center on x, plus the margin.
    expect(viewport?.zoom).toBeCloseTo(1000 / (2 * 950 * 1.3));
  });

  it('ignores nodes that are not visible', () => {
    const viewport = getFocusViewport({
      ...base,
      nodes,
      focusId: 'a',
      visibleIds: new Set(['a', 'b']),
    });
    const withFar = getFocusViewport({
      ...base,
      nodes,
      focusId: 'a',
      visibleIds: new Set(['a', 'b', 'far']),
    });

    expect(withFar?.zoom).toBeLessThan(viewport?.zoom ?? 0);
  });

  it('returns undefined for an unknown node or an empty canvas', () => {
    expect(
      getFocusViewport({ ...base, nodes, focusId: 'missing', visibleIds: new Set() })
    ).toBeUndefined();
    expect(
      getFocusViewport({ ...base, nodes, focusId: 'a', visibleIds: new Set(), canvasWidth: 0 })
    ).toBeUndefined();
  });
});
