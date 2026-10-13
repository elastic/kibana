/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { omit } from 'lodash';
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
 * or edited items (or every container, when `instructions` are given) are arranged into rows by the
 * injected `arrangeLayout` call; code turns the rows into grid positions. Without the call, or when
 * it fails, the current rows are kept and the other items are packed below them. The user's
 * layout instructions are kept in `layout_rules` and passed to every later layout call.
 */
export const arrangeDashboardLayout = async ({
  originalDashboardData,
  dashboardData,
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
    const { items, currentRows } = layoutContainers[containerIndex];
    const rows =
      arrangement?.containers.find(({ section }) => section === container.key)?.rows ??
      getCurrentLayoutRows(items, currentRows);
    placeRows(items, rows).forEach((grid, id) => placements.set(id, grid));
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

/** A panel of a row, with the width the row asks for. A user-sized panel keeps its size. */
interface RowEntry {
  panel: LayoutPanel;
  w: number;
  userSized?: boolean;
}

/** Panels of one row, left to right, with a shared height. */
interface PanelLine {
  kind: 'panels';
  entries: RowEntry[];
  h: number;
}

/** A row of a container: a section, or a row of panels. */
type Line = PanelLine | { kind: 'section'; id: string };

const UNBOUNDED: SizeBounds = { min: { w: 1, h: 1 }, max: { w: GRID_COLUMNS, h: 100 } };

/**
 * Size range a panel may take: the size the user asked for, else the range of its size class.
 * The range of an existing panel includes its current size, so sizes set by hand are kept.
 */
const getEntryBounds = ({ panel, w, userSized }: RowEntry, h: number): SizeBounds => {
  if (userSized) {
    return { min: { w, h }, max: { w, h } };
  }
  const { sizeClass, size, isNew } = panel;
  const bounds = sizeClass ? getSizeBounds(sizeClass) : UNBOUNDED;
  if (isNew) {
    return bounds;
  }
  return {
    min: { w: Math.min(bounds.min.w, size.w), h: Math.min(bounds.min.h, size.h) },
    max: { w: Math.max(bounds.max.w, size.w), h: Math.max(bounds.max.h, size.h) },
  };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const sumWidths = (widths: number[]): number => widths.reduce((acc, width) => acc + width, 0);

/**
 * Sizes the panels of a row within their bounds. Widths grow or shrink one column at a time,
 * starting with the panel with the most room, until the row is 48 wide or no panel can change.
 * The row height is kept within the height range every panel accepts; new and edited markdown
 * panels take the height their text needs.
 */
const fitLine = ({ entries, h }: PanelLine): LineEntry[] => {
  const bounds = entries.map((entry) => getEntryBounds(entry, h));
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

  const heights = entries.map(({ panel, userSized }, index) => {
    const { textLines, isNew, contentChanged } = panel;
    if (userSized || textLines === undefined || !(isNew || contentChanged)) {
      return { min: bounds[index].min.h, max: bounds[index].max.h };
    }
    const textHeight = getMarkdownHeight(textLines, widths[index]);
    return { min: textHeight, max: textHeight };
  });
  const minHeight = Math.max(...heights.map(({ min }) => min));
  const maxHeight = Math.min(...heights.map(({ max }) => max));
  return entries.map(({ panel }, index) => ({
    id: panel.id,
    w: widths[index],
    h:
      minHeight <= maxHeight
        ? clamp(h, minHeight, maxHeight)
        : clamp(h, heights[index].min, heights[index].max),
  }));
};

/**
 * Moves a row that leaves a gap even at its panels' largest sizes into the row above, when the
 * panels of both rows fit in one row at their smallest widths and the row above keeps its height.
 */
const pullUpUnderfilledLines = (lines: Line[]): Line[] =>
  lines.reduce<Line[]>((result, line) => {
    const previous = result[result.length - 1];
    if (
      line.kind !== 'panels' ||
      previous?.kind !== 'panels' ||
      line.entries.some(({ userSized }) => userSized) ||
      sumWidths(fitLine(line).map(({ w }) => w)) >= GRID_COLUMNS
    ) {
      return [...result, line];
    }
    const merged: PanelLine = { ...previous, entries: [...previous.entries, ...line.entries] };
    const bounds = merged.entries.map((entry) => getEntryBounds(entry, previous.h));
    const fits =
      sumWidths(bounds.map(({ min }) => min.w)) <= GRID_COLUMNS &&
      bounds.every(({ min, max }) => min.h <= previous.h && previous.h <= max.h);
    return fits ? [...result.slice(0, -1), merged] : [...result, line];
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

/** The current rows of a container, in the shape the layout step returns. */
const getCurrentLayoutRows = (items: LayoutItem[], currentRows: string[][]): LayoutRow[] => {
  const sizeById = new Map(
    items.map((item) => [item.id, item.kind === 'panel' ? item.size : undefined])
  );
  return currentRows.map((ids) => ({
    h: Math.max(...ids.map((id) => sizeById.get(id)?.h ?? SECTION_HEIGHT)),
    items: ids.map((id) => ({ id, w: sizeById.get(id)?.w ?? GRID_COLUMNS })),
  }));
};

/**
 * Turns the rows of one container into grid positions. Sections take a row of their own; unknown
 * and repeated ids are ignored, and items the rows left out are added below them. Panel rows are
 * sized within their bounds, after underfilled rows are pulled up.
 */
const placeRows = (items: LayoutItem[], rows: LayoutRow[]): Placements => {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const usedIds = new Set<string>();
  const lines: Line[] = [];

  for (const row of rows) {
    let current: PanelLine | undefined;
    for (const { id, w, userSized } of row.items) {
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
      current.entries.push({ panel: item, w, userSized });
    }
  }

  const placements: Placements = new Map();
  const remaining = toLines(items.filter(({ id }) => !usedIds.has(id)));
  pullUpUnderfilledLines([...lines, ...remaining]).reduce((y, line) => {
    if (line.kind === 'section') {
      placements.set(line.id, { x: 0, y, w: GRID_COLUMNS, h: SECTION_HEIGHT });
      return y + SECTION_HEIGHT;
    }
    return placeLine(fitLine(line), y, placements);
  }, 0);
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
