/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computePanelPixelPositions, computePageSize } from './dashboard_panel_layout';
import type { DashboardPanelLayout } from './dashboard_panel_layout';

describe('computePanelPixelPositions', () => {
  it('places a single full-width panel flush against the gutter', () => {
    const panels: DashboardPanelLayout[] = [
      { panelIndex: 'a', gridData: { x: 0, y: 0, w: 48, h: 10, i: 'a' } },
    ];
    const [position] = computePanelPixelPositions(panels, { containerWidthPx: 1200 });

    expect(position).toEqual({
      panelIndex: 'a',
      title: undefined,
      left: 8,
      top: 8,
      width: 1184, // containerWidthPx minus the left+right gutter used as grid padding
      height: 10 * 20 + 9 * 8, // 9 internal row-gutters for a 10-row-tall panel
    });
  });

  it('places two side-by-side half-width panels with a gutter between them', () => {
    const panels: DashboardPanelLayout[] = [
      { panelIndex: 'left', gridData: { x: 0, y: 0, w: 24, h: 10, i: 'left' } },
      { panelIndex: 'right', gridData: { x: 24, y: 0, w: 24, h: 10, i: 'right' } },
    ];
    const [left, right] = computePanelPixelPositions(panels, { containerWidthPx: 1200 });

    // columnWidthPx = (contentWidthPx - 8*47) / 48, where contentWidthPx = 1200 - 2*8
    const columnWidthPx = (1200 - 8 * 2 - 8 * 47) / 48;
    expect(left.left).toBe(8);
    expect(left.width).toBeCloseTo(24 * columnWidthPx + 23 * 8, 5);
    // right panel starts right after left panel's width plus one gutter.
    expect(right.left).toBeCloseTo(left.left + left.width + 8, 5);
  });

  it('stacks panels vertically using gridData.y and the configured row height', () => {
    const panels: DashboardPanelLayout[] = [
      { panelIndex: 'top', gridData: { x: 0, y: 0, w: 48, h: 5, i: 'top' } },
      { panelIndex: 'bottom', gridData: { x: 0, y: 5, w: 48, h: 5, i: 'bottom' } },
    ];
    const [top, bottom] = computePanelPixelPositions(panels, { containerWidthPx: 1200 });

    expect(top.top).toBe(8);
    expect(bottom.top).toBe(8 + 5 * (20 + 8));
  });

  it('honors custom column count, row height, and gutter size', () => {
    const panels: DashboardPanelLayout[] = [
      { panelIndex: 'a', gridData: { x: 0, y: 0, w: 2, h: 1, i: 'a' } },
    ];
    const [position] = computePanelPixelPositions(panels, {
      containerWidthPx: 100,
      columnCount: 4,
      rowHeightPx: 50,
      gutterSizePx: 0,
    });

    expect(position).toEqual(expect.objectContaining({ left: 0, top: 0, width: 50, height: 50 }));
  });

  it('carries the panel title through untouched', () => {
    const panels: DashboardPanelLayout[] = [
      { panelIndex: 'a', title: 'My panel', gridData: { x: 0, y: 0, w: 48, h: 10, i: 'a' } },
    ];
    const [position] = computePanelPixelPositions(panels, { containerWidthPx: 1200 });
    expect(position.title).toBe('My panel');
  });
});

describe('computePageSize', () => {
  it('returns the container width and the tallest panel bottom edge plus the bottom gutter', () => {
    const panels: DashboardPanelLayout[] = [
      { panelIndex: 'a', gridData: { x: 0, y: 0, w: 48, h: 5, i: 'a' } },
      { panelIndex: 'b', gridData: { x: 0, y: 5, w: 48, h: 10, i: 'b' } },
    ];
    const positions = computePanelPixelPositions(panels, { containerWidthPx: 1200 });
    const size = computePageSize(positions, { containerWidthPx: 1200 });

    expect(size.width).toBe(1200);
    const lastPanel = positions[1];
    expect(size.height).toBeCloseTo(lastPanel.top + lastPanel.height + 8, 5);
  });

  it('returns twice the gutter size for an empty panel list', () => {
    expect(computePageSize([], { containerWidthPx: 1200 })).toEqual({ width: 1200, height: 16 });
  });
});
