/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  computeKiGraphLabelIds,
  KI_GRAPH_LABEL_CHAR_WIDTH,
  KI_GRAPH_LABEL_HEIGHT,
  KI_GRAPH_LABEL_LOW_ZOOM_HUBS,
  type KiGraphLabelPlacementNode,
} from './use_visible_label_ids';

const node = (
  id: string,
  x: number,
  y: number,
  degree: number,
  title = id,
  size = 24
): KiGraphLabelPlacementNode => ({
  id,
  title,
  degree,
  position: { x, y },
  size,
});

describe('computeKiGraphLabelIds', () => {
  it('prefers higher-degree nodes when the label budget is tight', () => {
    const nodes = [node('low', 0, 0, 1), node('high', 120, 0, 10)];

    const { normalZoomLabelIds } = computeKiGraphLabelIds({
      nodes,
      labelHeight: KI_GRAPH_LABEL_HEIGHT,
      charWidth: KI_GRAPH_LABEL_CHAR_WIDTH,
      maxLabels: 1,
    });

    expect(normalZoomLabelIds.has('high')).toBe(true);
    expect(normalZoomLabelIds.has('low')).toBe(false);
  });

  it('includes disjoint labels for multiple nodes', () => {
    const nodes = [node('a', 0, 0, 5), node('b', 200, 0, 4)];

    const { normalZoomLabelIds } = computeKiGraphLabelIds({
      nodes,
      labelHeight: KI_GRAPH_LABEL_HEIGHT,
      charWidth: KI_GRAPH_LABEL_CHAR_WIDTH,
      maxLabels: 10,
    });

    expect(normalZoomLabelIds.has('a')).toBe(true);
    expect(normalZoomLabelIds.has('b')).toBe(true);
  });

  it('limits low-zoom labels to hub candidates', () => {
    const nodes = Array.from({ length: KI_GRAPH_LABEL_LOW_ZOOM_HUBS + 2 }, (_, index) =>
      node(`n${index}`, index * 80, 0, KI_GRAPH_LABEL_LOW_ZOOM_HUBS + 2 - index)
    );

    const { lowZoomLabelIds, normalZoomLabelIds } = computeKiGraphLabelIds({
      nodes,
      labelHeight: KI_GRAPH_LABEL_HEIGHT,
      charWidth: KI_GRAPH_LABEL_CHAR_WIDTH,
      maxLabels: 50,
    });

    expect(normalZoomLabelIds.size).toBeGreaterThan(lowZoomLabelIds.size);
    for (const id of lowZoomLabelIds) {
      expect(nodes.some((entry) => entry.id === id)).toBe(true);
    }
  });
});
