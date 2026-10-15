/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type AttachmentPanel,
  type DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { getWidgetsBottomY } from '../dashboard_state';
import { GRID_COLUMNS } from './types';

/** Size of a new panel until the layout call places it. */
const DEFAULT_PANEL_SIZE = { w: 24, h: 10 } as const;

type DashboardWidget = AttachmentPanel | DashboardSection;

type PanelGrid = AttachmentPanel['grid'];

const toPanelGrid = (widget: DashboardWidget): PanelGrid =>
  isSection(widget)
    ? {
        x: 0,
        y: widget.grid.y,
        w: GRID_COLUMNS,
        h: Math.max(getWidgetsBottomY([widget]) - widget.grid.y, 1),
      }
    : widget.grid;

/**
 * Returns the grid of a new panel until the layout call places it: default-size panels, two per
 * row, below the existing widgets of the container and never overlapping them.
 */
export const getPlaceholderGrid = (widgets: DashboardWidget[]): PanelGrid => {
  const { w, h } = DEFAULT_PANEL_SIZE;
  const grids = widgets.map(toPanelGrid);
  const lastGrid = grids.reduce<PanelGrid | undefined>((last, grid) => {
    if (!last) return grid;
    const bottom = grid.y + grid.h;
    const lastBottom = last.y + last.h;
    return bottom > lastBottom || (bottom === lastBottom && grid.y > last.y) ? grid : last;
  }, undefined);

  if (!lastGrid) {
    return { x: 0, y: 0, w, h };
  }

  const rowY = lastGrid.y;
  const isRightHalfFree = !grids.some(
    (grid) => grid.x + grid.w > w && grid.y < rowY + h && grid.y + grid.h > rowY
  );
  return isRightHalfFree ? { x: w, y: rowY, w, h } : { x: 0, y: getWidgetsBottomY(widgets), w, h };
};
