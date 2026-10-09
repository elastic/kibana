/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { getPanelsBottomY, getWidgetsBottomY } from '../dashboard_state';

/**
 * Moves the given panels below `baseY`, keeping their arrangement relative to each other. Other
 * panels are returned unchanged.
 */
const stackBelow = (
  panels: AttachmentPanel[],
  panelIds: ReadonlySet<string>,
  baseY: number
): AttachmentPanel[] => {
  const stackedYs = panels.filter(({ id }) => panelIds.has(id)).map(({ grid }) => grid.y);
  if (stackedYs.length === 0) {
    return panels;
  }
  const offset = baseY - Math.min(...stackedYs);
  return panels.map((panel) =>
    panelIds.has(panel.id) ? { ...panel, grid: { ...panel.grid, y: panel.grid.y + offset } } : panel
  );
};

/**
 * Places what the upsert could not position from the caller's input:
 * - panels moved to another container without a `grid` go below the other panels of that
 *   container, keeping their relative arrangement;
 * - new sections go below all other widgets, one outer row each, in creation order.
 */
export const placeNewWidgets = ({
  dashboardData,
  movedPanelIds,
  newSectionIds,
}: {
  dashboardData: DashboardAttachmentData;
  movedPanelIds: ReadonlySet<string>;
  newSectionIds: ReadonlySet<string>;
}): DashboardAttachmentData => {
  const { panels: widgets } = dashboardData;

  const topLevelPanels = widgets.filter((widget): widget is AttachmentPanel => !isSection(widget));
  const placedTopLevelWidgets = widgets.filter((widget) =>
    isSection(widget) ? !newSectionIds.has(widget.id) : !movedPanelIds.has(widget.id)
  );
  const stackedTopLevelPanels = stackBelow(
    topLevelPanels,
    movedPanelIds,
    getWidgetsBottomY(placedTopLevelWidgets)
  );
  const stackedTopLevelPanelsById = new Map(
    stackedTopLevelPanels.map((panel) => [panel.id, panel])
  );

  const widgetsWithMovedPanels = widgets.map((widget) => {
    if (!isSection(widget)) {
      return stackedTopLevelPanelsById.get(widget.id) ?? widget;
    }
    const placedPanels = widget.panels.filter(({ id }) => !movedPanelIds.has(id));
    return {
      ...widget,
      panels: stackBelow(widget.panels, movedPanelIds, getPanelsBottomY(placedPanels)),
    };
  });

  let nextSectionY = getWidgetsBottomY(
    widgetsWithMovedPanels.filter((widget) => !isSection(widget) || !newSectionIds.has(widget.id))
  );
  return {
    ...dashboardData,
    panels: widgetsWithMovedPanels.map((widget) => {
      if (!isSection(widget) || !newSectionIds.has(widget.id)) {
        return widget;
      }
      const sectionY = nextSectionY;
      nextSectionY += 1;
      return { ...widget, grid: { ...widget.grid, y: sectionY } };
    }),
  };
};
