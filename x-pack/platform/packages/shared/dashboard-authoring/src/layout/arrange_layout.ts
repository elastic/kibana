/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { getErrorMessage } from '../utils';
import { getLensChartType } from './default_sizes';
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

const SECTION_HEIGHT = 1;

const getContainerKeyByPanelId = ({ panels }: DashboardAttachmentData): Map<string, ContainerKey> =>
  new Map(
    panels.flatMap(
      (widget): Array<[string, ContainerKey]> =>
        isSection(widget) ? widget.panels.map(({ id }) => [id, widget.id]) : [[widget.id, null]]
    )
  );

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
  /** Panels whose content was replaced by a different kind, so their size no longer fits. */
  replacedPanelIds: ReadonlySet<string>;
  /** Layout instructions; when set, every container is arranged again. */
  instructions?: string;
  authoringNotesByPanelId: ReadonlyMap<string, string>;
  arrangeLayout?: ArrangeDashboardLayout;
  logger: Logger;
}

/**
 * Places the panels and sections a change touched. Containers with added, moved, removed, or
 * resized items (or every container, when `instructions` are given) are arranged into rows by the
 * injected `arrangeLayout` call; code turns the rows into grid positions. Without the call, or when
 * it fails, existing items keep their position and the others are packed below them.
 */
export const arrangeDashboardLayout = async ({
  originalDashboardData,
  dashboardData,
  fixedSizePanelIds,
  replacedPanelIds,
  instructions,
  authoringNotesByPanelId,
  arrangeLayout,
  logger,
}: ArrangeLayoutParams): Promise<DashboardAttachmentData> => {
  const originalContainerKeyByPanelId = getContainerKeyByPanelId(originalDashboardData);
  const originalSectionIds = new Set(
    originalDashboardData.panels.filter(isSection).map(({ id }) => id)
  );

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
      widgets.some(({ id }) => fixedSizePanelIds.has(id) || replacedPanelIds.has(id)) ||
      widgets.some((widget) => isNewItem(widget, key))
  );

  if (dirtyContainers.length === 0) {
    return dashboardData;
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
    return {
      kind: 'panel',
      id: widget.id,
      type: widget.type,
      ...(chartType ? { chartType } : {}),
      ...(title ? { title } : {}),
      ...(authoringNote ? { authoringNote } : {}),
      size: { w: widget.grid.w, h: widget.grid.h },
      isNew: isNewItem(widget, key),
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
  }));

  const arrangement = await requestArrangement({
    arrangeLayout,
    logger,
    request: {
      dashboardTitle: dashboardData.title,
      ...(dashboardData.description ? { dashboardDescription: dashboardData.description } : {}),
      ...(instructions !== undefined ? { instructions } : {}),
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

  return applyPlacements(dashboardData, placements);
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

/** Scales widths proportionally so they add up to `total`, keeping each at least 1. */
const scaleWidths = (widths: number[], total: number): number[] => {
  const sum = widths.reduce((acc, width) => acc + width, 0);
  const exact = widths.map((width) => (width * total) / sum);
  const scaled = exact.map((value) => Math.max(1, Math.floor(value)));
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder);

  let missing = total - scaled.reduce((acc, width) => acc + width, 0);
  for (let i = 0; missing > 0; i = (i + 1) % byRemainder.length, missing--) {
    scaled[byRemainder[i].index] += 1;
  }
  while (missing < 0) {
    const widest = scaled.indexOf(Math.max(...scaled));
    scaled[widest] -= 1;
    missing++;
  }
  return scaled;
};

/**
 * Places one row of panels from `y`. Widths of panels without a fixed size are scaled so the row
 * fills the grid; panels that still do not fit wrap onto the next line. Returns the next free `y`.
 */
const placePanelRow = (
  entries: Array<{ panel: LayoutPanel; w: number }>,
  h: number,
  startY: number,
  placements: Placements
): number => {
  const fixedWidth = entries
    .filter(({ panel }) => panel.fixedSize)
    .reduce((acc, { panel }) => acc + panel.size.w, 0);
  const flexibleEntries = entries.filter(({ panel }) => !panel.fixedSize);
  const availableWidth = GRID_COLUMNS - fixedWidth;
  const flexibleWidths =
    flexibleEntries.length > 0 && availableWidth >= flexibleEntries.length
      ? scaleWidths(
          flexibleEntries.map(({ w }) => w),
          availableWidth
        )
      : flexibleEntries.map(({ w }) => w);
  const widthByPanel = new Map(flexibleEntries.map(({ panel }, i) => [panel, flexibleWidths[i]]));

  let x = 0;
  let y = startY;
  let lineHeight = 0;
  for (const { panel } of entries) {
    const w = panel.fixedSize ? panel.size.w : widthByPanel.get(panel) ?? panel.size.w;
    const panelHeight = panel.fixedSize ? panel.size.h : h;
    if (x > 0 && x + w > GRID_COLUMNS) {
      y += lineHeight;
      x = 0;
      lineHeight = 0;
    }
    placements.set(panel.id, { x, y, w, h: panelHeight });
    x += w;
    lineHeight = Math.max(lineHeight, panelHeight);
  }
  return y + lineHeight;
};

/** Packs items left to right at their current size, sections on their own row. */
const packItems = (items: LayoutItem[], startY: number, placements: Placements): number => {
  let y = startY;
  let line: Array<{ panel: LayoutPanel; w: number }> = [];
  let lineWidth = 0;

  const flushLine = () => {
    if (line.length === 0) {
      return;
    }
    let x = 0;
    let lineHeight = 0;
    for (const { panel, w } of line) {
      placements.set(panel.id, { x, y, w, h: panel.size.h });
      x += w;
      lineHeight = Math.max(lineHeight, panel.size.h);
    }
    y += lineHeight;
    line = [];
    lineWidth = 0;
  };

  for (const item of items) {
    if (item.kind === 'section') {
      flushLine();
      placements.set(item.id, { x: 0, y, w: GRID_COLUMNS, h: SECTION_HEIGHT });
      y += SECTION_HEIGHT;
      continue;
    }
    const w = Math.min(item.size.w, GRID_COLUMNS);
    if (lineWidth + w > GRID_COLUMNS) {
      flushLine();
    }
    line.push({ panel: item, w });
    lineWidth += w;
  }
  flushLine();
  return y;
};

/**
 * Turns the rows of one container into grid positions. Sections take a row of their own; unknown
 * and repeated ids are ignored, and items the rows left out are packed below them.
 */
const placeRows = (items: LayoutItem[], rows: LayoutRow[]): Placements => {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const placements: Placements = new Map();
  let y = 0;

  for (const row of rows) {
    let panelEntries: Array<{ panel: LayoutPanel; w: number }> = [];
    const flushPanels = () => {
      if (panelEntries.length > 0) {
        y = placePanelRow(panelEntries, row.h, y, placements);
        panelEntries = [];
      }
    };

    for (const { id, w } of row.items) {
      const item = itemsById.get(id);
      if (!item || placements.has(id) || panelEntries.some(({ panel }) => panel.id === id)) {
        continue;
      }
      if (item.kind === 'section') {
        flushPanels();
        placements.set(id, { x: 0, y, w: GRID_COLUMNS, h: SECTION_HEIGHT });
        y += SECTION_HEIGHT;
        continue;
      }
      panelEntries.push({ panel: item, w });
    }
    flushPanels();
  }

  packItems(
    items.filter(({ id }) => !placements.has(id)),
    y,
    placements
  );
  return placements;
};

/** Keeps existing items where they are and packs new or moved items below them. */
const placeAfterExistingItems = ({ widgets }: ContainerState, items: LayoutItem[]): Placements => {
  const widgetsById = new Map(widgets.map((widget) => [widget.id, widget]));
  const placements: Placements = new Map();
  let bottomY = 0;

  for (const item of items) {
    const widget = widgetsById.get(item.id);
    if (!widget || item.isNew) {
      continue;
    }
    const grid = getWidgetGrid(widget);
    const placedGrid = { ...grid, x: Math.max(0, Math.min(grid.x, GRID_COLUMNS - grid.w)) };
    placements.set(item.id, placedGrid);
    bottomY = Math.max(bottomY, placedGrid.y + placedGrid.h);
  }

  packItems(
    items.filter(({ isNew }) => isNew),
    bottomY,
    placements
  );
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
