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

/** Short ids for the layout call, since models miscopy long ids such as UUIDs. */
const createAliases = (...widgetLists: Widgets[]): Map<string, string> => {
  const aliasById = new Map<string, string>();
  let panelCount = 0;
  let sectionCount = 0;
  for (const widget of widgetLists.flat()) {
    const panels = isSection(widget) ? widget.panels : [widget];
    if (isSection(widget) && !aliasById.has(widget.id)) {
      aliasById.set(widget.id, `s${++sectionCount}`);
    }
    for (const { id } of panels) {
      if (!aliasById.has(id)) {
        aliasById.set(id, `p${++panelCount}`);
      }
    }
  }
  return aliasById;
};

const toLayoutPanel = (
  panel: AttachmentPanel,
  withGrid: boolean,
  aliasById: ReadonlyMap<string, string>
): LayoutPanel => {
  const { id, type, config, grid } = panel;
  const content = getContent(panel);
  return {
    id: aliasById.get(id) ?? id,
    type,
    ...(typeof config.type === 'string' ? { chartType: config.type } : {}),
    ...(typeof config.title === 'string' ? { title: config.title } : {}),
    ...(content !== undefined ? { content: content.slice(0, MAX_CONTENT_LENGTH) } : {}),
    ...(withGrid ? { grid } : {}),
  };
};

const byReadingOrder = (a: AttachmentPanel, b: AttachmentPanel): number =>
  a.grid.y - b.grid.y || a.grid.x - b.grid.x;

const toLayoutDashboard = (
  widgets: Widgets,
  withGrid: boolean,
  aliasById: ReadonlyMap<string, string>
): LayoutDashboard => {
  const toLayoutPanels = (panels: AttachmentPanel[]) =>
    [...panels].sort(byReadingOrder).map((panel) => toLayoutPanel(panel, withGrid, aliasById));
  return {
    panels: toLayoutPanels(
      widgets.filter((widget): widget is AttachmentPanel => !isSection(widget))
    ),
    sections: widgets
      .filter(isSection)
      .sort((a, b) => a.grid.y - b.grid.y)
      .map(({ id, title, grid, panels }) => ({
        id: aliasById.get(id) ?? id,
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

const getChanges = (
  previousWidgets: Widgets,
  currentWidgets: Widgets,
  aliasById: ReadonlyMap<string, string>
): LayoutChanges => {
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
  return Object.fromEntries(
    Object.entries(changes)
      .filter(([, ids]) => ids.length > 0)
      .map(([key, ids]: [string, string[]]) => [key, ids.map((id) => aliasById.get(id) ?? id)])
  );
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
  if (dashboardData.panels.length === 0) {
    return dashboardData;
  }

  const aliasById = createAliases(dashboardData.panels, originalPanels);
  const changes = getChanges(originalPanels, dashboardData.panels, aliasById);
  if (instructions === undefined && Object.keys(changes).length === 0) {
    return dashboardData;
  }

  const request: LayoutRequest = {
    ...(instructions !== undefined ? { instructions } : {}),
    ...(originalPanels.length > 0
      ? { previous: toLayoutDashboard(originalPanels, true, aliasById) }
      : {}),
    current: toLayoutDashboard(dashboardData.panels, false, aliasById),
    changes,
  };

  const result = await requestArrangement(arrangeLayout, request, aliasById, dashboardData.panels);
  if ('arrangement' in result) {
    return applyArrangement(dashboardData, result.arrangement);
  }

  logger.warn(`Dashboard layout kept the current layout: ${result.error}`);
  // The agent does not see grids, so it can only learn from a failure that its layout request was
  // not applied.
  if (instructions !== undefined) {
    reportFailure({
      type: DASHBOARD_OPERATION_FAILURE_TYPES.layout,
      identifier: 'layout',
      error: `The layout request was not applied, so panel positions and sizes are unchanged: ${result.error}`,
    });
  }
  return dashboardData;
};

/** Maps the arrangement back to ids. Unknown aliases are kept, so the check reports them. */
const fromAliases = (
  arrangement: LayoutArrangement,
  aliasById: ReadonlyMap<string, string>
): LayoutArrangement => {
  const idByAlias = new Map([...aliasById].map(([id, alias]) => [alias, id]));
  const toIds = (arrangedPanels: LayoutArrangement['panels']) =>
    arrangedPanels.map((panel) => ({ ...panel, id: idByAlias.get(panel.id) ?? panel.id }));
  return {
    ...arrangement,
    panels: toIds(arrangement.panels),
    sections: arrangement.sections.map((section) => ({
      ...section,
      id: idByAlias.get(section.id) ?? section.id,
      panels: toIds(section.panels),
    })),
  };
};

const requestArrangement = async (
  arrangeLayout: ArrangeDashboardLayout,
  request: LayoutRequest,
  aliasById: ReadonlyMap<string, string>,
  currentWidgets: Widgets
): Promise<{ arrangement: LayoutArrangement } | { error: string }> => {
  try {
    const result = layoutArrangementSchema.safeParse(await arrangeLayout(request));
    if (!result.success) {
      return { error: `invalid arrangement: ${result.error.message}` };
    }
    const arrangement = fromAliases(result.data, aliasById);
    const issue = getIncompleteArrangementIssue(
      toLayoutDashboard(currentWidgets, false, new Map()),
      arrangement
    );
    return issue ? { error: `incomplete arrangement: ${issue}` } : { arrangement };
  } catch (error) {
    return { error: `layout call failed: ${getErrorMessage(error)}` };
  }
};

/**
 * Applying only part of an arrangement mixes the old and the new layout, so an arrangement that
 * misses or repeats a panel or section, places a panel in another container, overflows the grid,
 * or puts a section on a row shared with another section or a top-level panel, is rejected as a
 * whole.
 */
const getIncompleteArrangementIssue = (
  { panels, sections }: LayoutDashboard,
  arrangement: LayoutArrangement
): string | undefined => {
  const arrangedSectionsById = new Map(
    arrangement.sections.map((section) => [section.id, section])
  );
  const missingSection = sections.find(({ id }) => !arrangedSectionsById.has(id));
  if (missingSection) {
    return `section "${missingSection.id}" is missing`;
  }
  if (arrangedSectionsById.size < arrangement.sections.length) {
    return 'a section is repeated';
  }
  // Kibana orders sections and top-level panels by row, so a shared row has no defined order.
  const sectionOnSharedRow = arrangement.sections.find(
    ({ id, y }) =>
      arrangement.sections.some((other) => other.id !== id && other.y === y) ||
      arrangement.panels.some((panel) => panel.y <= y && y < panel.y + panel.h)
  );
  if (sectionOnSharedRow) {
    return `section "${sectionOnSharedRow.id}" shares a row with another section or panel`;
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
    if (arrangedPanelIds.size < arranged.length) {
      return 'a panel is repeated in its container';
    }
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
