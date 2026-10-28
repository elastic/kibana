/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/as-code-dashboard-schema';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import { getErrorMessage, type DashboardFailure } from '../utils';
import {
  type ArrangeDashboardLayout,
  type LayoutArrangement,
  type LayoutGrid,
  type LayoutPanel,
  type LayoutPanelKind,
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
const createAliases = (widgets: Widgets): Map<string, string> => {
  const aliasById = new Map<string, string>();
  let panelCount = 0;
  let sectionCount = 0;
  for (const widget of widgets) {
    if (isSection(widget)) {
      aliasById.set(widget.id, `s${++sectionCount}`);
    }
    for (const { id } of isSection(widget) ? widget.panels : [widget]) {
      aliasById.set(id, `p${++panelCount}`);
    }
  }
  return aliasById;
};

/** The container of every panel: the id of its section, or `null` for the top level. */
type Placement = ReadonlyMap<string, string | null>;

const getPlacement = (widgets: Widgets): Placement =>
  new Map(
    widgets.flatMap(
      (widget): Array<[string, string | null]> =>
        isSection(widget) ? widget.panels.map(({ id }) => [id, widget.id]) : [[widget.id, null]]
    )
  );

const getSectionIds = (widgets: Widgets): Set<string> =>
  new Set(widgets.filter(isSection).map(({ id }) => id));

/** Whether a panel or section was added or removed, or a panel moved to another container. */
const hasContainerChanges = (widgets: Widgets, originalWidgets: Widgets): boolean => {
  const placement = getPlacement(widgets);
  const originalPlacement = getPlacement(originalWidgets);
  const sectionIds = getSectionIds(widgets);
  const originalSectionIds = getSectionIds(originalWidgets);
  return (
    placement.size !== originalPlacement.size ||
    [...placement].some(([id, sectionId]) => originalPlacement.get(id) !== sectionId) ||
    sectionIds.size !== originalSectionIds.size ||
    [...sectionIds].some((id) => !originalSectionIds.has(id))
  );
};

const getKind = ({ type, config }: AttachmentPanel): LayoutPanelKind => ({
  type,
  ...(typeof config.type === 'string' ? { chartType: config.type } : {}),
});

const getPanelsById = (widgets: Widgets): Map<string, AttachmentPanel> =>
  new Map(
    widgets
      .flatMap((widget) => (isSection(widget) ? widget.panels : [widget]))
      .map((panel) => [panel.id, panel])
  );

/** The previous kind of every panel whose kind changed, e.g. a donut edited into a table. */
const getPreviousKinds = (
  widgets: Widgets,
  originalWidgets: Widgets
): Map<string, LayoutPanelKind> => {
  const originalPanelsById = getPanelsById(originalWidgets);
  return new Map(
    [...getPanelsById(widgets).values()].flatMap((panel): Array<[string, LayoutPanelKind]> => {
      const originalPanel = originalPanelsById.get(panel.id);
      if (!originalPanel) {
        return [];
      }
      const previousKind = getKind(originalPanel);
      const kind = getKind(panel);
      return previousKind.type === kind.type && previousKind.chartType === kind.chartType
        ? []
        : [[panel.id, previousKind]];
    })
  );
};

/** The ids of the markdown panels whose text changed, which may need another height. */
const getChangedTextIds = (widgets: Widgets, originalWidgets: Widgets): Set<string> => {
  const originalPanelsById = getPanelsById(originalWidgets);
  return new Set(
    [...getPanelsById(widgets).values()]
      .filter((panel) => {
        const originalPanel = originalPanelsById.get(panel.id);
        return (
          panel.type === MARKDOWN_EMBEDDABLE_TYPE &&
          originalPanel?.type === MARKDOWN_EMBEDDABLE_TYPE &&
          originalPanel.config.content !== panel.config.content
        );
      })
      .map(({ id }) => id)
  );
};

const byReadingOrder = (a: AttachmentPanel, b: AttachmentPanel): number =>
  a.grid.y - b.grid.y || a.grid.x - b.grid.x;

const getContainerPanels = (widgets: Widgets, sectionId: string | null): AttachmentPanel[] =>
  sectionId === null
    ? widgets.filter((widget): widget is AttachmentPanel => !isSection(widget))
    : widgets.filter(isSection).find(({ id }) => id === sectionId)?.panels ?? [];

/** The grids that panels removed from a container, or moved out of it, had there. */
const getRemovedGrids = (
  originalWidgets: Widgets,
  placement: Placement,
  sectionId: string | null
): { removed?: LayoutGrid[] } => {
  const removed = getContainerPanels(originalWidgets, sectionId)
    .filter(({ id }) => placement.get(id) !== sectionId)
    .sort(byReadingOrder)
    .map(({ grid }) => grid);
  return removed.length > 0 ? { removed } : {};
};

/**
 * Writes the ids that `instructions` name as short ids, like the rest of the request. Ids that are
 * plain words are left, since they may be words of the instructions.
 */
const aliasInstructions = (instructions: string, aliasById: ReadonlyMap<string, string>): string =>
  instructions
    .split(/([^\w-]+)/)
    .map((word) => (/[^A-Za-z]/.test(word) ? aliasById.get(word) ?? word : word))
    .join('');

/**
 * The dashboard with short ids. Panels new to their container (added or moved) are sent without a
 * grid and new sections without a row, since their placeholder positions are for the call to set.
 * Moved panels keep their size. Retyped panels name the kind their grid was sized for, and markdown
 * panels whose text changed are flagged. Each changed container lists the space its removed and
 * moved-out panels left.
 */
const toLayoutRequest = (
  widgets: Widgets,
  originalWidgets: Widgets,
  previousKinds: ReadonlyMap<string, LayoutPanelKind>,
  changedTextIds: ReadonlySet<string>,
  aliasById: ReadonlyMap<string, string>,
  instructions: string | undefined
): LayoutRequest => {
  const placement = getPlacement(widgets);
  const originalPlacement = getPlacement(originalWidgets);
  const originalSectionIds = getSectionIds(originalWidgets);
  const getPlacementHint = (
    { id, grid }: AttachmentPanel,
    sectionId: string | null
  ): Pick<LayoutPanel, 'grid' | 'size'> => {
    const originalSectionId = originalPlacement.get(id);
    if (originalSectionId === undefined) {
      return {};
    }
    return originalSectionId === sectionId ? { grid } : { size: { w: grid.w, h: grid.h } };
  };
  const toLayoutPanels = (panels: AttachmentPanel[], sectionId: string | null): LayoutPanel[] =>
    [...panels].sort(byReadingOrder).map((panel) => {
      const { id, config } = panel;
      const content = getContent(panel);
      const previousKind = previousKinds.get(id);
      return {
        id: aliasById.get(id) ?? id,
        ...getKind(panel),
        ...(typeof config.title === 'string' ? { title: config.title } : {}),
        ...(content !== undefined ? { content: content.slice(0, MAX_CONTENT_LENGTH) } : {}),
        ...getPlacementHint(panel, sectionId),
        ...(previousKind ? { retypedFrom: previousKind } : {}),
        ...(changedTextIds.has(id) ? { textChanged: true as const } : {}),
      };
    });
  return {
    ...(instructions !== undefined
      ? { instructions: aliasInstructions(instructions, aliasById) }
      : {}),
    panels: toLayoutPanels(
      widgets.filter((widget): widget is AttachmentPanel => !isSection(widget)),
      null
    ),
    ...getRemovedGrids(originalWidgets, placement, null),
    sections: widgets
      .filter(isSection)
      .sort((a, b) => a.grid.y - b.grid.y)
      .map(({ id, title, grid, panels }) => ({
        id: aliasById.get(id) ?? id,
        title,
        ...(originalSectionIds.has(id) ? { y: grid.y } : {}),
        panels: toLayoutPanels(panels, id),
        ...getRemovedGrids(originalWidgets, placement, id),
      })),
  };
};

interface ArrangeLayoutParams {
  /** Panels and sections before this call; empty for a new dashboard. */
  originalPanels: Widgets;
  dashboardData: DashboardAttachmentData;
  /** Where panels and sections go, from the user or the authoring agent. */
  instructions?: string;
  arrangeLayout: ArrangeDashboardLayout;
  logger: Logger;
}

interface ArrangeLayoutResult {
  dashboardData: DashboardAttachmentData;
  /** Set when a layout was asked for but not applied. */
  failure?: DashboardFailure;
}

/**
 * Sets the grid of every panel and section with the injected `arrangeLayout` model call, when the
 * user or the agent asked for a layout, a panel or section is new to its container, a panel was
 * removed, or a panel changed its kind or markdown text and may need another size. The call gets the
 * dashboard as it is, without the placeholder grids of new panels. When
 * the call fails, the dashboard keeps its current layout, and a failure is returned if a layout was
 * asked for.
 */
export const arrangeDashboardLayout = async ({
  originalPanels,
  dashboardData,
  instructions,
  arrangeLayout,
  logger,
}: ArrangeLayoutParams): Promise<ArrangeLayoutResult> => {
  if (dashboardData.panels.length === 0) {
    return { dashboardData };
  }

  const aliasById = createAliases(dashboardData.panels);
  const previousKinds = getPreviousKinds(dashboardData.panels, originalPanels);
  const changedTextIds = getChangedTextIds(dashboardData.panels, originalPanels);
  if (
    instructions === undefined &&
    previousKinds.size === 0 &&
    changedTextIds.size === 0 &&
    !hasContainerChanges(dashboardData.panels, originalPanels)
  ) {
    return { dashboardData };
  }
  const request = toLayoutRequest(
    dashboardData.panels,
    originalPanels,
    previousKinds,
    changedTextIds,
    aliasById,
    instructions
  );

  const idByAlias = new Map([...aliasById].map(([id, alias]) => [alias, id]));
  const toId = (alias: string): string => idByAlias.get(alias) ?? alias;
  try {
    const arrangement = await requestArrangement(arrangeLayout, request, toId);
    return { dashboardData: applyArrangement(dashboardData, arrangement, toId) };
  } catch (error) {
    const message = getErrorMessage(error);
    logger.warn(`Dashboard layout kept the current layout: ${message}`);
    // The grids in the result do not show that a layout request was ignored, so report it.
    if (instructions === undefined) {
      return { dashboardData };
    }
    return {
      dashboardData,
      failure: {
        type: DASHBOARD_FAILURE_TYPES.layout,
        kind: 'dashboard',
        identifier: 'layout',
        error: `The layout request was not applied, so panel positions and sizes are unchanged: ${message}`,
      },
    };
  }
};

/** Returns the checked arrangement, still with aliases, or throws why it cannot be applied. */
const requestArrangement = async (
  arrangeLayout: ArrangeDashboardLayout,
  request: LayoutRequest,
  toId: (alias: string) => string
): Promise<LayoutArrangement> => {
  const arrangement = await arrangeLayout(request).catch((error) => {
    throw new Error(`layout call failed: ${getErrorMessage(error)}`);
  });
  const issue = getIncompleteArrangementIssue(request, arrangement, toId);
  if (issue) {
    throw new Error(`incomplete arrangement: ${issue}`);
  }
  return arrangement;
};

/**
 * Applying only part of an arrangement mixes the old and the new layout, so an arrangement that
 * misses or repeats a panel or section, places a panel in another container, overflows the grid,
 * or puts a section on a row shared with another section or a top-level panel, is rejected as a
 * whole. A section returned without panels keeps its layout. Both sides use aliases; `toId` reports
 * the original ids.
 */
const getIncompleteArrangementIssue = (
  { panels, sections }: LayoutRequest,
  arrangement: LayoutArrangement,
  toId: (alias: string) => string
): string | undefined => {
  const arrangedSectionsById = new Map(
    arrangement.sections.map((section) => [section.id, section])
  );
  const missingSection = sections.find(({ id }) => !arrangedSectionsById.has(id));
  if (missingSection) {
    return `section "${toId(missingSection.id)}" is missing`;
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
    return `section "${toId(sectionOnSharedRow.id)}" shares a row with another section or panel`;
  }

  const containers = [
    { requested: panels, arranged: arrangement.panels },
    ...sections.flatMap(({ id, panels: requested }) => {
      const arranged = arrangedSectionsById.get(id)?.panels ?? [];
      return arranged.length > 0 ? [{ requested, arranged }] : [];
    }),
  ];
  for (const { requested, arranged } of containers) {
    const overflowingPanel = arranged.find(({ x, w }) => x + w > DASHBOARD_GRID_COLUMN_COUNT);
    if (overflowingPanel) {
      return `panel "${toId(
        overflowingPanel.id
      )}" overflows the ${DASHBOARD_GRID_COLUMN_COUNT}-column grid`;
    }
    const arrangedPanelIds = new Set(arranged.map(({ id }) => id));
    if (arrangedPanelIds.size < arranged.length) {
      return 'a panel is repeated in its container';
    }
    const missingPanel = requested.find(({ id }) => !arrangedPanelIds.has(id));
    if (missingPanel) {
      return `panel "${toId(missingPanel.id)}" is missing from its container`;
    }
  }
  return undefined;
};

/**
 * Writes only grids, within the bounds of `layoutArrangementSchema`, which are stricter than the
 * dashboard schema. So the arranged dashboard needs no second validation. Unknown aliases are
 * ignored.
 */
const applyArrangement = (
  dashboardData: DashboardAttachmentData,
  { panels, sections }: LayoutArrangement,
  toId: (alias: string) => string
): DashboardAttachmentData => {
  const toGridByPanelId = (arrangedPanels: LayoutArrangement['panels']) =>
    new Map(arrangedPanels.map(({ id, ...grid }) => [toId(id), grid]));
  const topLevelGridByPanelId = toGridByPanelId(panels);
  const sectionsById = new Map(
    sections.map(({ id, y, panels: sectionPanels }) => [
      toId(id),
      { y, gridByPanelId: toGridByPanelId(sectionPanels) },
    ])
  );
  const placePanel = (
    panel: AttachmentPanel,
    gridByPanelId: ReadonlyMap<string, AttachmentPanel['grid']> | undefined
  ): AttachmentPanel => ({ ...panel, grid: gridByPanelId?.get(panel.id) ?? panel.grid });

  return {
    ...dashboardData,
    panels: dashboardData.panels.map((widget) => {
      if (!isSection(widget)) {
        return placePanel(widget, topLevelGridByPanelId);
      }
      const arrangedSection = sectionsById.get(widget.id);
      return {
        ...widget,
        grid: { y: arrangedSection?.y ?? widget.grid.y },
        panels: widget.panels.map((panel) => placePanel(panel, arrangedSection?.gridByPanelId)),
      };
    }),
  };
};
