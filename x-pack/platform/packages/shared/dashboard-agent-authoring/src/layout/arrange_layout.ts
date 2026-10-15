/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { getErrorMessage, type OperationFailure } from '../utils';
import {
  GRID_COLUMNS,
  layoutArrangementSchema,
  type ArrangeDashboardLayout,
  type LayoutArrangement,
  type LayoutChanges,
  type LayoutDashboard,
  type LayoutPanel,
  type LayoutRequest,
} from './types';

/** Long content is cut, since its start is enough to judge the height it needs. */
const MAX_CONTENT_LENGTH = 2000;

type Widgets = DashboardAttachmentData['panels'];

const getContent = ({ type, config }: AttachmentPanel): string | undefined => {
  if (type === MARKDOWN_EMBEDDABLE_TYPE && typeof config.content === 'string') {
    return config.content;
  }
  return type === CUSTOM_CONTENT_EMBEDDABLE_TYPE ? JSON.stringify(config) : undefined;
};

const toLayoutPanel = (panel: AttachmentPanel, withGrid: boolean): LayoutPanel => {
  const { id, type, config, grid } = panel;
  const content = getContent(panel);
  return {
    id,
    type,
    ...(typeof config.type === 'string' ? { chartType: config.type } : {}),
    ...(typeof config.title === 'string' ? { title: config.title } : {}),
    ...(content !== undefined ? { content: content.slice(0, MAX_CONTENT_LENGTH) } : {}),
    ...(withGrid ? { grid } : {}),
  };
};

const byReadingOrder = (a: AttachmentPanel, b: AttachmentPanel): number =>
  a.grid.y - b.grid.y || a.grid.x - b.grid.x;

const toLayoutDashboard = (widgets: Widgets, withGrid: boolean): LayoutDashboard => {
  const toLayoutPanels = (panels: AttachmentPanel[]) =>
    [...panels].sort(byReadingOrder).map((panel) => toLayoutPanel(panel, withGrid));
  return {
    panels: toLayoutPanels(
      widgets.filter((widget): widget is AttachmentPanel => !isSection(widget))
    ),
    sections: widgets
      .filter(isSection)
      .sort((a, b) => a.grid.y - b.grid.y)
      .map(({ id, title, grid, panels }) => ({
        id,
        title,
        ...(withGrid ? { y: grid.y } : {}),
        panels: toLayoutPanels(panels),
      })),
  };
};

/** Each panel by id, with the id of its section, or null for a top-level panel. */
const getPanelsById = (
  widgets: Widgets
): Map<string, { panel: AttachmentPanel; sectionId: string | null }> =>
  new Map(
    widgets.flatMap(
      (widget): Array<[string, { panel: AttachmentPanel; sectionId: string | null }]> =>
        isSection(widget)
          ? widget.panels.map((panel) => [panel.id, { panel, sectionId: widget.id }])
          : [[widget.id, { panel: widget, sectionId: null }]]
    )
  );

const getChanges = (previousWidgets: Widgets, currentWidgets: Widgets): LayoutChanges => {
  const previousPanels = getPanelsById(previousWidgets);
  const currentPanels = getPanelsById(currentWidgets);
  const previousSectionIds = new Set(previousWidgets.filter(isSection).map(({ id }) => id));
  const currentSectionIds = new Set(currentWidgets.filter(isSection).map(({ id }) => id));
  const currentIds = [...currentPanels.keys()];
  const isEdited = (id: string): boolean => {
    const previous = previousPanels.get(id)?.panel;
    const current = currentPanels.get(id)?.panel;
    return (
      previous !== undefined &&
      current !== undefined &&
      (previous.type !== current.type ||
        previous.config.type !== current.config.type ||
        getContent(previous) !== getContent(current))
    );
  };
  const changes: LayoutChanges = {
    addedPanels: currentIds.filter((id) => !previousPanels.has(id)),
    removedPanels: [...previousPanels.keys()].filter((id) => !currentPanels.has(id)),
    movedPanels: currentIds.filter(
      (id) =>
        previousPanels.has(id) &&
        previousPanels.get(id)?.sectionId !== currentPanels.get(id)?.sectionId
    ),
    editedPanels: currentIds.filter(isEdited),
    addedSections: [...currentSectionIds].filter((id) => !previousSectionIds.has(id)),
    removedSections: [...previousSectionIds].filter((id) => !currentSectionIds.has(id)),
  };
  return Object.fromEntries(Object.entries(changes).filter(([, ids]) => ids.length > 0));
};

interface ArrangeLayoutParams {
  /** Panels and sections before this call; empty for a new dashboard. */
  originalPanels: Widgets;
  dashboardData: DashboardAttachmentData;
  /** Where panels and sections go, from the user or the authoring agent. */
  instructions?: string;
  arrangeLayout: ArrangeDashboardLayout;
  reportFailure: (failure: OperationFailure) => void;
  logger: Logger;
}

/**
 * Sets the grid of every panel and section with the injected `arrangeLayout` model call, when the
 * user or the agent asked for a layout, or panels or sections were added, removed, moved to another
 * container, or changed chart type or content. The call gets the previous dashboard with its grids,
 * the current one, and what changed. When the call fails, the dashboard keeps its current layout,
 * and a failure is reported if a layout was asked for.
 */
export const arrangeDashboardLayout = async ({
  originalPanels,
  dashboardData,
  instructions,
  arrangeLayout,
  reportFailure,
  logger,
}: ArrangeLayoutParams): Promise<DashboardAttachmentData> => {
  const reportUnappliedRequest = (reason: string) => {
    // The agent no longer sees grids, so it can only learn from a failure that its layout request
    // was not applied.
    if (instructions !== undefined) {
      reportFailure({
        type: DASHBOARD_OPERATION_FAILURE_TYPES.layout,
        identifier: 'layout',
        error: `The layout request was not applied, so panel positions and sizes are unchanged: ${reason}`,
      });
    }
  };

  if (dashboardData.panels.length === 0) {
    reportUnappliedRequest('the dashboard has no panels');
    return dashboardData;
  }

  const changes = getChanges(originalPanels, dashboardData.panels);
  if (instructions === undefined && Object.keys(changes).length === 0) {
    return dashboardData;
  }

  const request: LayoutRequest = {
    ...(instructions !== undefined ? { instructions } : {}),
    ...(originalPanels.length > 0 ? { previous: toLayoutDashboard(originalPanels, true) } : {}),
    current: toLayoutDashboard(dashboardData.panels, false),
    changes,
  };

  const result = await requestArrangement(arrangeLayout, request);
  if ('arrangement' in result) {
    return applyArrangement(dashboardData, result.arrangement);
  }

  logger.warn(`Dashboard layout kept the current layout: ${result.error}`);
  reportUnappliedRequest(result.error);
  return dashboardData;
};

const requestArrangement = async (
  arrangeLayout: ArrangeDashboardLayout,
  request: LayoutRequest
): Promise<{ arrangement: LayoutArrangement } | { error: string }> => {
  try {
    const result = layoutArrangementSchema.safeParse(await arrangeLayout(request));
    if (!result.success) {
      return { error: `invalid arrangement: ${result.error.message}` };
    }
    const issue = getIncompleteArrangementIssue(request, result.data);
    return issue ? { error: `incomplete arrangement: ${issue}` } : { arrangement: result.data };
  } catch (error) {
    return { error: `layout call failed: ${getErrorMessage(error)}` };
  }
};

/**
 * Applying only part of an arrangement mixes the old and the new layout, so an arrangement that
 * misses a panel or section, places a panel in another container, or overflows the grid, is
 * rejected as a whole.
 */
const getIncompleteArrangementIssue = (
  { current: { panels, sections } }: LayoutRequest,
  arrangement: LayoutArrangement
): string | undefined => {
  const arrangedSectionsById = new Map(
    arrangement.sections.map((section) => [section.id, section])
  );
  const missingSection = sections.find(({ id }) => !arrangedSectionsById.has(id));
  if (missingSection) {
    return `section "${missingSection.id}" is missing`;
  }

  const containers = [
    { requested: panels, arranged: arrangement.panels },
    ...sections.map(({ id, panels: requested }) => ({
      requested,
      arranged: arrangedSectionsById.get(id)?.panels ?? [],
    })),
  ];
  for (const { requested, arranged } of containers) {
    const overflowingPanel = arranged.find(({ x, w }) => x + w > GRID_COLUMNS);
    if (overflowingPanel) {
      return `panel "${overflowingPanel.id}" overflows the ${GRID_COLUMNS}-column grid`;
    }
    const arrangedPanelIds = new Set(arranged.map(({ id }) => id));
    const missingPanel = requested.find(({ id }) => !arrangedPanelIds.has(id));
    if (missingPanel) {
      return `panel "${missingPanel.id}" is missing from its container`;
    }
  }
  return undefined;
};

/**
 * Writes only grids, within the bounds of `layoutArrangementSchema`, which are stricter than the
 * dashboard schema. So the arranged dashboard needs no second validation.
 */
const applyArrangement = (
  dashboardData: DashboardAttachmentData,
  { panels, sections }: LayoutArrangement
): DashboardAttachmentData => {
  const toGridByPanelId = (arrangedPanels: LayoutArrangement['panels']) =>
    new Map(arrangedPanels.map(({ id, ...grid }) => [id, grid]));
  const topLevelGridByPanelId = toGridByPanelId(panels);
  const sectionsById = new Map(
    sections.map(({ id, y, panels: sectionPanels }) => [
      id,
      { y, gridByPanelId: toGridByPanelId(sectionPanels) },
    ])
  );
  const placePanel =
    (gridByPanelId: ReadonlyMap<string, AttachmentPanel['grid']> | undefined) =>
    (panel: AttachmentPanel): AttachmentPanel => ({
      ...panel,
      grid: gridByPanelId?.get(panel.id) ?? panel.grid,
    });

  return {
    ...dashboardData,
    panels: dashboardData.panels.map((widget) => {
      if (!isSection(widget)) {
        return placePanel(topLevelGridByPanelId)(widget);
      }
      const arrangedSection = sectionsById.get(widget.id);
      return {
        ...widget,
        grid: { y: arrangedSection?.y ?? widget.grid.y },
        panels: widget.panels.map(placePanel(arrangedSection?.gridByPanelId)),
      };
    }),
  };
};
