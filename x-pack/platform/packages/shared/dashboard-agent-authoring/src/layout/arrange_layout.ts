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
  type DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { getSectionIdByPanelId, getSectionsById } from '../dashboard_state';
import { getErrorMessage } from '../utils';
import {
  getLensChartType,
  getMarkdownHeight,
  getMarkdownTextLines,
  getPanelSizeClass,
} from './panel_sizes';
import {
  GRID_COLUMNS,
  layoutArrangementSchema,
  type ArrangeDashboardLayout,
  type LayoutArrangement,
  type LayoutContainer,
  type LayoutPanel,
  type LayoutSectionItem,
} from './types';

type PanelGrid = AttachmentPanel['grid'];
type LayoutRow = LayoutArrangement['containers'][number]['rows'][number];
type LayoutItem = LayoutPanel | LayoutSectionItem;

/** Section ids are never null, so null keys the top-level container. */
type ContainerKey = string | null;

/** Grid of every placed item. Sections only use `y`, as they take one row of the top level. */
type Placements = Map<string, PanelGrid>;

/** A panel to place on a line, at its final size. */
interface LineEntry {
  id: string;
  w: number;
  h: number;
}

const SECTION_HEIGHT = 1;

const compareReadingOrder = (left: { y: number; x: number }, right: { y: number; x: number }) =>
  left.y - right.y || left.x - right.x;

const getWidgetGrid = (widget: AttachmentPanel | DashboardSection): PanelGrid =>
  isSection(widget) ? { x: 0, y: widget.grid.y, w: GRID_COLUMNS, h: SECTION_HEIGHT } : widget.grid;

const getPanelTitle = ({ config }: AttachmentPanel): string | undefined =>
  typeof config.title === 'string' ? config.title : undefined;

interface ContainerState {
  key: ContainerKey;
  title?: string;
  widgets: Array<AttachmentPanel | DashboardSection>;
}

interface ArrangeLayoutParams {
  originalDashboardData: DashboardAttachmentData;
  dashboardData: DashboardAttachmentData;
  /** Existing panels whose content was edited in this call. */
  editedPanelIds: ReadonlySet<string>;
  /** Layout instructions; when set, every container is arranged again. */
  instructions?: string;
  /** The user's earlier layout overrides of the defaults, which still apply. */
  layoutOverrides?: string;
  authoringNotesByPanelId: ReadonlyMap<string, string>;
  arrangeLayout?: ArrangeDashboardLayout;
  logger: Logger;
}

export interface ArrangedDashboardLayout {
  dashboardData: DashboardAttachmentData;
  /** The user's layout overrides of the defaults, to pass to the next call. */
  layoutOverrides?: string;
}

/**
 * Places the panels and sections a change touched. Containers with added, moved, removed,
 * or edited items (or every container, when `instructions` are given) are arranged into rows by the
 * injected `arrangeLayout` call; code turns the rows into grid positions. Without the call, or when
 * it fails, existing items keep their position and new ones are packed below them. The layout
 * call also updates the user's layout overrides.
 */
export const arrangeDashboardLayout = async ({
  originalDashboardData,
  dashboardData,
  editedPanelIds,
  instructions,
  layoutOverrides,
  authoringNotesByPanelId,
  arrangeLayout,
  logger,
}: ArrangeLayoutParams): Promise<ArrangedDashboardLayout> => {
  const originalContainerKeyByPanelId = getSectionIdByPanelId(originalDashboardData);
  const originalSectionIds = new Set(getSectionsById(originalDashboardData).keys());

  const isNewItem = (widget: AttachmentPanel | DashboardSection, key: ContainerKey): boolean =>
    isSection(widget)
      ? !originalSectionIds.has(widget.id)
      : originalContainerKeyByPanelId.get(widget.id) !== key;

  const containers: ContainerState[] = [
    { key: null, widgets: dashboardData.panels },
    ...dashboardData.panels
      .filter(isSection)
      .map((section) => ({ key: section.id, title: section.title, widgets: section.panels })),
  ];

  const hasRemovedItems = (key: ContainerKey, widgets: ContainerState['widgets']): boolean => {
    const currentIds = new Set(widgets.map(({ id }) => id));
    return (
      [...originalContainerKeyByPanelId].some(
        ([id, originalKey]) => originalKey === key && !currentIds.has(id)
      ) ||
      (key === null && [...originalSectionIds].some((id) => !currentIds.has(id)))
    );
  };

  const dirtyContainers = containers.filter(
    ({ key, widgets }) =>
      instructions !== undefined ||
      hasRemovedItems(key, widgets) ||
      widgets.some(({ id }) => editedPanelIds.has(id)) ||
      widgets.some((widget) => isNewItem(widget, key))
  );

  if (dirtyContainers.length === 0) {
    return { dashboardData, layoutOverrides };
  }

  const toLayoutItem = (
    widget: AttachmentPanel | DashboardSection,
    key: ContainerKey
  ): LayoutItem => {
    if (isSection(widget)) {
      return {
        kind: 'section',
        id: widget.id,
        title: widget.title,
        isNew: isNewItem(widget, key),
      };
    }
    const authoringNote = authoringNotesByPanelId.get(widget.id);
    const chartType = getLensChartType(widget);
    const title = getPanelTitle(widget);
    const textLines = getMarkdownTextLines(widget);
    const sizeClass = getPanelSizeClass(widget);
    return {
      kind: 'panel',
      id: widget.id,
      type: widget.type,
      ...(chartType ? { chartType } : {}),
      ...(title ? { title } : {}),
      ...(authoringNote ? { authoringNote } : {}),
      ...(sizeClass ? { sizeClass } : {}),
      size: { w: widget.grid.w, h: widget.grid.h },
      ...(textLines !== undefined ? { textLines } : {}),
      isNew: isNewItem(widget, key),
      contentChanged: editedPanelIds.has(widget.id),
    };
  };

  /** Existing items in reading order, then new panels and new sections in the order they were added. */
  const getOrderedWidgets = ({ key, widgets }: ContainerState) => {
    const existing = widgets.filter((widget) => !isNewItem(widget, key));
    const added = widgets.filter((widget) => isNewItem(widget, key));
    return [
      ...sortByReadingOrder(existing),
      ...added.filter((widget) => !isSection(widget)),
      ...added.filter(isSection),
    ];
  };

  const layoutContainers: LayoutContainer[] = dirtyContainers.map((container) => ({
    section: container.key,
    ...(container.title !== undefined ? { title: container.title } : {}),
    items: getOrderedWidgets(container).map((widget) => toLayoutItem(widget, container.key)),
    currentRows: groupIntoRows(
      container.widgets.filter((widget) => !isNewItem(widget, container.key))
    ),
  }));

  const arrangement = await requestArrangement({
    arrangeLayout,
    logger,
    request: {
      dashboardTitle: dashboardData.title,
      ...(dashboardData.description ? { dashboardDescription: dashboardData.description } : {}),
      ...(instructions !== undefined ? { instructions } : {}),
      ...(layoutOverrides ? { layoutOverrides } : {}),
      containers: layoutContainers,
    },
  });

  const placements: Placements = new Map();
  dirtyContainers.forEach((container, containerIndex) => {
    const { items } = layoutContainers[containerIndex];
    const rows = arrangement?.containers.find(({ section }) => section === container.key)?.rows;
    const containerPlacements = rows
      ? placeRows(items, rows)
      : placeAfterExistingItems(container, items);
    containerPlacements.forEach((grid, id) => placements.set(id, grid));
  });

  const nextLayoutOverrides = arrangement?.layoutOverrides ?? layoutOverrides;

  return {
    dashboardData: applyPlacements(dashboardData, placements),
    layoutOverrides: nextLayoutOverrides || undefined,
  };
};

/** Ids of widgets grouped by the `y` they start at, in reading order. */
const groupIntoRows = (widgets: Array<AttachmentPanel | DashboardSection>): string[][] => {
  const rowsByY = new Map<number, string[]>();
  for (const widget of sortByReadingOrder(widgets)) {
    const { y } = getWidgetGrid(widget);
    rowsByY.set(y, [...(rowsByY.get(y) ?? []), widget.id]);
  }
  return [...rowsByY.values()];
};

const requestArrangement = async ({
  arrangeLayout,
  request,
  logger,
}: {
  arrangeLayout?: ArrangeDashboardLayout;
  request: Parameters<ArrangeDashboardLayout>[0];
  logger: Logger;
}): Promise<LayoutArrangement | undefined> => {
  if (!arrangeLayout) {
    return undefined;
  }
  try {
    const result = layoutArrangementSchema.safeParse(await arrangeLayout(request));
    if (result.success) {
      return result.data;
    }
    logger.warn(`Dashboard layout returned an invalid arrangement: ${result.error.message}`);
  } catch (error) {
    logger.warn(`Dashboard layout failed, using the default layout: ${getErrorMessage(error)}`);
  }
  return undefined;
};

/** A row of a container: a section, or panels left to right. */
type Line = { kind: 'panels'; entries: LineEntry[] } | { kind: 'section'; id: string };

/** Height of a panel in a row: the row height, or the height its text needs for new and edited markdown. */
const getEntryHeight = (
  { textLines, isNew, contentChanged }: LayoutPanel,
  w: number,
  rowHeight: number
): number =>
  textLines !== undefined && (isNew || contentChanged)
    ? getMarkdownHeight(textLines, w)
    : rowHeight;

/** Groups items into rows left to right at their current size, sections on a row of their own. */
const toLines = (items: LayoutItem[]): Line[] => {
  const lines: Line[] = [];
  let current: LineEntry[] | undefined;
  for (const item of items) {
    if (item.kind === 'section') {
      current = undefined;
      lines.push({ kind: 'section', id: item.id });
      continue;
    }
    const { w, h } = item.size;
    const usedWidth = current?.reduce((sum, entry) => sum + entry.w, 0) ?? 0;
    if (!current || usedWidth + w > GRID_COLUMNS) {
      current = [];
      lines.push({ kind: 'panels', entries: current });
    }
    current.push({ id: item.id, w: Math.min(w, GRID_COLUMNS), h });
  }
  return lines;
};

/**
 * Places entries left to right from `startY`, wrapping onto the next line when an entry does not
 * fit. Returns the next free `y`.
 */
const placeLine = (entries: LineEntry[], startY: number, placements: Placements): number => {
  let x = 0;
  let y = startY;
  let lineHeight = 0;
  for (const { id, w, h } of entries) {
    if (x > 0 && x + w > GRID_COLUMNS) {
      y += lineHeight;
      x = 0;
      lineHeight = 0;
    }
    placements.set(id, { x, y, w, h });
    x += w;
    lineHeight = Math.max(lineHeight, h);
  }
  return y + lineHeight;
};

/** Places rows top to bottom from `startY`; sections take a row of their own. */
const placeLines = (lines: Line[], startY: number, placements: Placements): void => {
  lines.reduce((y, line) => {
    if (line.kind === 'section') {
      placements.set(line.id, { x: 0, y, w: GRID_COLUMNS, h: SECTION_HEIGHT });
      return y + SECTION_HEIGHT;
    }
    return placeLine(line.entries, y, placements);
  }, startY);
};

/**
 * Turns the rows of one container into grid positions, at the sizes the rows give. Unknown and
 * repeated ids are ignored, and items the rows left out are added below them.
 */
const placeRows = (items: LayoutItem[], rows: LayoutRow[]): Placements => {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const usedIds = new Set<string>();
  const lines: Line[] = [];

  for (const row of rows) {
    let current: LineEntry[] | undefined;
    for (const { id, w } of row.items) {
      const item = itemsById.get(id);
      if (!item || usedIds.has(id)) {
        continue;
      }
      usedIds.add(id);
      if (item.kind === 'section') {
        current = undefined;
        lines.push({ kind: 'section', id });
        continue;
      }
      if (!current) {
        current = [];
        lines.push({ kind: 'panels', entries: current });
      }
      current.push({ id, w, h: getEntryHeight(item, w, row.h) });
    }
  }

  const placements: Placements = new Map();
  placeLines([...lines, ...toLines(items.filter(({ id }) => !usedIds.has(id)))], 0, placements);
  return placements;
};

/** Keeps existing items where they are and packs new or moved items below them. */
const placeAfterExistingItems = ({ widgets }: ContainerState, items: LayoutItem[]): Placements => {
  const placements: Placements = new Map();
  const existingIds = new Set(items.filter(({ isNew }) => !isNew).map(({ id }) => id));
  let bottomY = 0;
  for (const widget of widgets.filter(({ id }) => existingIds.has(id))) {
    const grid = getWidgetGrid(widget);
    placements.set(widget.id, grid);
    bottomY = Math.max(bottomY, grid.y + grid.h);
  }
  placeLines(toLines(items.filter(({ isNew }) => isNew)), bottomY, placements);
  return placements;
};

const sortByReadingOrder = <TWidget extends AttachmentPanel | DashboardSection>(
  widgets: TWidget[]
): TWidget[] =>
  [...widgets].sort((left, right) =>
    compareReadingOrder(getWidgetGrid(left), getWidgetGrid(right))
  );

const applyPlacements = (
  dashboardData: DashboardAttachmentData,
  placements: Placements
): DashboardAttachmentData => {
  const placePanel = (panel: AttachmentPanel): AttachmentPanel => {
    const grid = placements.get(panel.id);
    return grid ? { ...panel, grid } : panel;
  };

  const panels = dashboardData.panels.map((widget) => {
    if (!isSection(widget)) {
      return placePanel(widget);
    }
    const sectionGrid = placements.get(widget.id);
    return {
      ...widget,
      ...(sectionGrid ? { grid: { y: sectionGrid.y } } : {}),
      panels: sortByReadingOrder(widget.panels.map(placePanel)),
    };
  });

  return { ...dashboardData, panels: sortByReadingOrder(panels) };
};
