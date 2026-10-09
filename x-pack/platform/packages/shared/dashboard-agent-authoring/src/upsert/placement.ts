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

/** Container a moved panel came from, keyed by panel id: a section id, or null for the top level. */
export type MovedPanelSources = ReadonlyMap<string, string | null>;

/**
 * Moves the moved panels below `baseY`, one group per container they came from, each group below
 * the previous one and keeping its arrangement. Positions from different containers are unrelated,
 * so stacking the groups keeps them from overlapping. Other panels are returned unchanged.
 */
const stackBelow = (
  panels: AttachmentPanel[],
  movedPanelSources: MovedPanelSources,
  baseY: number
): AttachmentPanel[] => {
  const groupsBySource = new Map<string | null, AttachmentPanel[]>();
  for (const panel of panels) {
    const source = movedPanelSources.get(panel.id);
    if (source !== undefined) {
      groupsBySource.set(source, [...(groupsBySource.get(source) ?? []), panel]);
    }
  }

  const offsetsById = new Map<string, number>();
  let groupY = baseY;
  for (const group of groupsBySource.values()) {
    const offset = groupY - Math.min(...group.map(({ grid }) => grid.y));
    group.forEach(({ id }) => offsetsById.set(id, offset));
    groupY = getPanelsBottomY(group) + offset;
  }

  return panels.map((panel) => {
    const offset = offsetsById.get(panel.id);
    return offset === undefined
      ? panel
      : { ...panel, grid: { ...panel.grid, y: panel.grid.y + offset } };
  });
};

/**
 * Places what the upsert could not position from the caller's input:
 * - panels moved to another container without a `grid` go below the other panels of that
 *   container, keeping their arrangement within each container they came from;
 * - new sections go below all other widgets, one outer row each, in creation order.
 */
export const placeNewWidgets = ({
  dashboardData,
  movedPanelSources,
  newSectionIds,
}: {
  dashboardData: DashboardAttachmentData;
  movedPanelSources: MovedPanelSources;
  newSectionIds: ReadonlySet<string>;
}): DashboardAttachmentData => {
  const { panels: widgets } = dashboardData;

  const topLevelPanels = widgets.filter((widget): widget is AttachmentPanel => !isSection(widget));
  const placedTopLevelWidgets = widgets.filter((widget) =>
    isSection(widget) ? !newSectionIds.has(widget.id) : !movedPanelSources.has(widget.id)
  );
  const stackedTopLevelPanels = stackBelow(
    topLevelPanels,
    movedPanelSources,
    getWidgetsBottomY(placedTopLevelWidgets)
  );
  const stackedTopLevelPanelsById = new Map(
    stackedTopLevelPanels.map((panel) => [panel.id, panel])
  );

  const widgetsWithMovedPanels = widgets.map((widget) => {
    if (!isSection(widget)) {
      return stackedTopLevelPanelsById.get(widget.id) ?? widget;
    }
    const placedPanels = widget.panels.filter(({ id }) => !movedPanelSources.has(id));
    return {
      ...widget,
      panels: stackBelow(widget.panels, movedPanelSources, getPanelsBottomY(placedPanels)),
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
