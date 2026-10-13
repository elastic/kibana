/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isEqual, omit } from 'lodash';
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
  getSizeBounds,
  type SizeBounds,
} from './panel_sizes';
import {
  GRID_COLUMNS,
  layoutArrangementSchema,
  type ArrangeDashboardLayout,
  type LayoutArrangement,
  type LayoutContainer,
  type LayoutPanel,
  type LayoutSectionItem,
  MAX_LAYOUT_RULES,
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
  /** Panels sized explicitly in this call; the layout keeps their size. */
  fixedSizePanelIds: ReadonlySet<string>;
  /** Existing panels whose content was edited in this call. */
  editedPanelIds: ReadonlySet<string>;
  /** Layout instructions; when set, every container is arranged again. */
  instructions?: string;
  authoringNotesByPanelId: ReadonlyMap<string, string>;
  arrangeLayout?: ArrangeDashboardLayout;
  logger: Logger;
}

/**
 * Places the panels and sections a change touched. Containers with added, moved, removed,
 * edited, or resized items (or every container, when `instructions` are given) are arranged into rows by the
 * injected `arrangeLayout` call; code turns the rows into grid positions. Without the call, or when
 * it fails, existing items keep their position and the others are packed below them. The user's
 * layout instructions are kept in `layout_rules` and passed to every later layout call.
 */
export const arrangeDashboardLayout = async ({
  originalDashboardData,
  dashboardData,
  fixedSizePanelIds,
  editedPanelIds,
  instructions,
  authoringNotesByPanelId,
  arrangeLayout,
  logger,
}: ArrangeLayoutParams): Promise<DashboardAttachmentData> => {
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

  const getRemovedCount = (key: ContainerKey, widgets: ContainerState['widgets']): number => {
    const currentIds = new Set(widgets.map(({ id }) => id));
    const removedPanels = [...originalContainerKeyByPanelId].filter(
      ([id, originalKey]) => originalKey === key && !currentIds.has(id)
    );
    const removedSections =
      key === null ? [...originalSectionIds].filter((id) => !currentIds.has(id)) : [];
    return removedPanels.length + removedSections.length;
  };

  const dirtyContainers = containers.filter(
    ({ key, widgets }) =>
      instructions !== undefined ||
      getRemovedCount(key, widgets) > 0 ||
      widgets.some(({ id }) => fixedSizePanelIds.has(id) || editedPanelIds.has(id)) ||
      widgets.some((widget) => isNewItem(widget, key))
  );

  if (dirtyContainers.length === 0) {
    return dashboardData;
  }

  const previousRules = dashboardData.layout_rules ?? [];

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
      fixedSize: fixedSizePanelIds.has(widget.id),
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
      ...(previousRules.length > 0 ? { rules: previousRules } : {}),
      containers: layoutContainers,
    },
  });

  const placements: Placements = new Map();
  dirtyContainers.forEach((container, containerIndex) => {
    const { items } = layoutContainers[containerIndex];
    const rows = arrangement?.containers.find(({ section }) => section === container.key)?.rows;
    const containerPlacements = rows
      ? placeRows(items, rows)
      : placeAfterExistingItems(
          container,
          items,
          getRemovedCount(container.key, container.widgets)
        );
    containerPlacements.forEach((grid, id) => placements.set(id, grid));
  });

  const rules =
    instructions === undefined
      ? previousRules
      : arrangement?.rules ?? [...previousRules, instructions].slice(-MAX_LAYOUT_RULES);

  return withLayoutRules(applyPlacements(dashboardData, placements), rules);
};

const withLayoutRules = (
  dashboardData: DashboardAttachmentData,
  rules: string[]
): DashboardAttachmentData =>
  rules.length > 0
    ? { ...dashboardData, layout_rules: rules }
    : omit(dashboardData, 'layout_rules');

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

/** Panels of one row, left to right, with the width the row asks for, and a shared height. */
interface PanelLine {
  kind: 'panels';
  entries: Array<{ panel: LayoutPanel; w: number }>;
  h: number;
}

/** A row of a container: a section, or a row of panels. */
type Line = PanelLine | { kind: 'section'; id: string };

const UNBOUNDED: SizeBounds = { min: { w: 1, h: 1 }, max: { w: GRID_COLUMNS, h: 100 } };

/** Size range a panel may take: its own size when sized explicitly, else its size class. */
const getPanelBounds = ({ fixedSize, size, sizeClass }: LayoutPanel): SizeBounds => {
  if (fixedSize) {
    return { min: size, max: size };
  }
  return sizeClass ? getSizeBounds(sizeClass) : UNBOUNDED;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const sumWidths = (widths: number[]): number => widths.reduce((acc, width) => acc + width, 0);

/**
 * Sizes the panels of a row within their bounds. Widths grow or shrink one column at a time,
 * starting with the panel with the most room, until the row is 48 wide or no panel can change.
 * The row height is kept within the height range every panel accepts.
 */
const fitLine = ({ entries, h }: PanelLine): LineEntry[] => {
  const bounds = entries.map(({ panel }) => getPanelBounds(panel));
  const widths = entries.map(({ w }, index) => clamp(w, bounds[index].min.w, bounds[index].max.w));

  const direction = Math.sign(GRID_COLUMNS - sumWidths(widths));
  for (let missing = Math.abs(GRID_COLUMNS - sumWidths(widths)); missing > 0; missing--) {
    const room = widths.map((width, index) =>
      direction > 0 ? bounds[index].max.w - width : width - bounds[index].min.w
    );
    const index = room.indexOf(Math.max(...room));
    if (room[index] <= 0) {
      break;
    }
    widths[index] += direction;
  }

  const minHeight = Math.max(...bounds.map(({ min }) => min.h));
  const maxHeight = Math.min(...bounds.map(({ max }) => max.h));
  return entries.map(({ panel }, index) => ({
    id: panel.id,
    w: widths[index],
    h:
      minHeight <= maxHeight
        ? clamp(h, minHeight, maxHeight)
        : clamp(h, bounds[index].min.h, bounds[index].max.h),
  }));
};

/** Whether the panels of two rows fit in one row at their smallest sizes and a shared height. */
const canShareLine = (entries: PanelLine['entries']): boolean => {
  const bounds = entries.map(({ panel }) => getPanelBounds(panel));
  return (
    sumWidths(bounds.map(({ min }) => min.w)) <= GRID_COLUMNS &&
    Math.max(...bounds.map(({ min }) => min.h)) <= Math.min(...bounds.map(({ max }) => max.h))
  );
};

/**
 * Moves a row that leaves a gap even at its panels' largest sizes into the row above it, when both
 * fit in one row by shrinking toward their smallest sizes.
 */
const pullUpUnderfilledLines = (lines: Line[]): Line[] =>
  lines.reduce<Line[]>((result, line) => {
    const previous = result[result.length - 1];
    if (
      line.kind === 'panels' &&
      previous?.kind === 'panels' &&
      sumWidths(fitLine(line).map(({ w }) => w)) < GRID_COLUMNS &&
      canShareLine([...previous.entries, ...line.entries])
    ) {
      return [
        ...result.slice(0, -1),
        { ...previous, entries: [...previous.entries, ...line.entries] },
      ];
    }
    return [...result, line];
  }, []);

/** Groups items into rows left to right at their current size, sections on a row of their own. */
const toLines = (items: LayoutItem[]): Line[] => {
  const lines: Line[] = [];
  let current: PanelLine | undefined;
  for (const item of items) {
    if (item.kind === 'section') {
      current = undefined;
      lines.push({ kind: 'section', id: item.id });
      continue;
    }
    const w = Math.min(item.size.w, GRID_COLUMNS);
    if (!current || sumWidths(current.entries.map((entry) => entry.w)) + w > GRID_COLUMNS) {
      current = { kind: 'panels', entries: [], h: item.size.h };
      lines.push(current);
    }
    current.entries.push({ panel: item, w });
    current.h = Math.max(current.h, item.size.h);
  }
  return lines;
};

/**
 * Places rows top to bottom from `startY`: sections take a row of their own, and panel rows are
 * sized within their bounds, after underfilled rows are pulled up. Returns the next free `y`.
 */
const placeLines = (lines: Line[], startY: number, placements: Placements): number =>
  pullUpUnderfilledLines(lines).reduce((y, line) => {
    if (line.kind === 'section') {
      placements.set(line.id, { x: 0, y, w: GRID_COLUMNS, h: SECTION_HEIGHT });
      return y + SECTION_HEIGHT;
    }
    return placeLine(fitLine(line), y, placements);
  }, startY);

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

/**
 * Turns the rows of one container into grid positions. Sections take a row of their own; unknown
 * and repeated ids are ignored, and items the rows left out are added below them.
 */
const placeRows = (items: LayoutItem[], rows: LayoutRow[]): Placements => {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const usedIds = new Set<string>();
  const lines: Line[] = [];

  for (const row of rows) {
    let current: PanelLine | undefined;
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
        current = { kind: 'panels', entries: [], h: row.h };
        lines.push(current);
      }
      current.entries.push({ panel: item, w });
    }
  }

  const placements: Placements = new Map();
  placeLines([...lines, ...toLines(items.filter(({ id }) => !usedIds.has(id)))], 0, placements);
  return placements;
};

/**
 * Keeps existing items where they are and adds new or moved items below them. When an item was
 * resized, edited, or removed, places all items again in reading order at their new sizes, so the
 * container has no overlaps or gaps.
 */
const placeAfterExistingItems = (
  { widgets }: ContainerState,
  items: LayoutItem[],
  removedCount: number
): Placements => {
  const placements: Placements = new Map();
  const resizedItems = items.map((item): LayoutItem => {
    if (item.kind !== 'panel' || !item.contentChanged || item.fixedSize || !item.textLines) {
      return item;
    }
    const size = { w: GRID_COLUMNS, h: getMarkdownHeight(item.textLines, GRID_COLUMNS) };
    return isEqual(size, item.size) ? item : { ...item, size };
  });
  const isResized = resizedItems.some(
    (item, index) =>
      item.kind === 'panel' && !item.isNew && (item.fixedSize || item !== items[index])
  );

  if (isResized || removedCount > 0) {
    placeLines(toLines(resizedItems), 0, placements);
    return placements;
  }

  const existingIds = new Set(items.filter(({ isNew }) => !isNew).map(({ id }) => id));
  let bottomY = 0;
  for (const widget of widgets.filter(({ id }) => existingIds.has(id))) {
    const grid = getWidgetGrid(widget);
    const placedGrid = { ...grid, x: Math.max(0, Math.min(grid.x, GRID_COLUMNS - grid.w)) };
    placements.set(widget.id, placedGrid);
    bottomY = Math.max(bottomY, placedGrid.y + placedGrid.h);
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
