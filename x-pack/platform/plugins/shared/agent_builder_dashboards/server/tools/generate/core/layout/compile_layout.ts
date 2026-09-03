/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { getWidgetsBottomY } from '../dashboard_state';
import type { PanelFailure } from '../utils';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { deriveRowsFromGrid } from './derive_rows_from_grid';
import { getPanelLayoutSize, usesLoneDefaultWidth } from './size_table';
import type { ChartTypeLayout } from '@kbn/agent-builder-visualizations-server';

export const GRID_WIDTH = 48;

export const NAMED_WIDTH = {
  full: 48,
  half: 24,
  third: 16,
  quarter: 12,
  sixth: 8,
  eighth: 6,
} as const;

export type WidthName = keyof typeof NAMED_WIDTH;
export type WidthHint = WidthName | number;
export type PanelRefInput = string | { ref: string; width?: WidthHint };

export interface SectionLayoutInput {
  ref?: string;
  key?: string;
  title?: string;
  collapsed?: boolean;
  rows: PanelRefInput[][];
}

export interface LayoutSpec {
  auto?: true;
  rows?: PanelRefInput[][];
  sections?: SectionLayoutInput[];
}

export interface LayoutWarning {
  panelId?: string;
  message: string;
}

export type CompileLayoutSpec = LayoutSpec | { implicitPanelIds: string[] };

export interface CompileLayoutParams {
  dashboard: DashboardAttachmentData;
  spec: CompileLayoutSpec;
  panelKeys: Map<string, string>;
}

export interface CompileLayoutResult {
  dashboard: DashboardAttachmentData;
  rows: string[][];
  warnings: LayoutWarning[];
  failures: PanelFailure[];
  mintedKeys: Map<string, string>;
}

interface Placeable {
  panel: AttachmentPanel;
  explicitWidth?: number;
  size: ChartTypeLayout;
}

interface PlacedPanel {
  panel: AttachmentPanel;
  x: number;
  w: number;
  h: number;
}

const UNPLACED_WARNING = 'panels not placed by layout';

const isImplicitSpec = (spec: CompileLayoutSpec): spec is { implicitPanelIds: string[] } =>
  'implicitPanelIds' in spec;

const parseRef = (ref: PanelRefInput): { ref: string; width?: number } => {
  if (typeof ref === 'string') {
    return { ref };
  }
  if (ref.width === undefined) {
    return { ref: ref.ref };
  }
  if (typeof ref.width === 'number') {
    return { ref: ref.ref, width: ref.width };
  }
  return { ref: ref.ref, width: NAMED_WIDTH[ref.width] };
};

const equalSplit = (n: number): number[] => {
  const base = Math.floor(GRID_WIDTH / n);
  const rem = GRID_WIDTH % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
};

const nearestAllowed = (width: number, allowed: readonly number[]): number => {
  return allowed.reduce((best, candidate) =>
    Math.abs(candidate - width) < Math.abs(best - width) ? candidate : best
  );
};

const fitsUnsized = (items: Placeable[]): boolean => {
  if (items.length === 0) {
    return true;
  }
  const maxPerRow = Math.min(...items.map((item) => item.size.maxPerRow));
  if (items.length > maxPerRow) {
    return false;
  }
  const minW = Math.max(...items.map((item) => item.size.minW));
  return Math.floor(GRID_WIDTH / items.length) >= minW;
};

const splitUnsized = (items: Placeable[]): Placeable[][] => {
  const rows: Placeable[][] = [];
  let current: Placeable[] = [];
  for (const item of items) {
    const next = [...current, item];
    if (current.length > 0 && !fitsUnsized(next)) {
      rows.push(current);
      current = [item];
    } else {
      current = next;
    }
  }
  if (current.length > 0) {
    rows.push(current);
  }
  return rows;
};

const placeLoneDefault = (item: Placeable, warnings: LayoutWarning[]): PlacedPanel[] => {
  warnings.push({
    panelId: item.panel.id,
    message: 'lone metric/gauge/pie uses default width',
  });
  return [{ panel: item.panel, x: 0, w: item.size.defaultW, h: item.size.h }];
};

const placeUnsizedGroup = (group: Placeable[], warnings: LayoutWarning[]): PlacedPanel[] => {
  if (group.length === 1 && usesLoneDefaultWidth(group[0].panel)) {
    return placeLoneDefault(group[0], warnings);
  }
  const widths = equalSplit(group.length);
  const h = Math.max(...group.map((item) => item.size.h));
  let x = 0;
  return group.map((item, index) => {
    const placed = { panel: item.panel, x, w: widths[index], h };
    x += widths[index];
    return placed;
  });
};

const placeExplicitItems = (items: Placeable[], warnings: LayoutWarning[]): PlacedPanel[][] => {
  const prepared = items.map((item) => {
    if (item.explicitWidth === undefined) {
      return { item, w: item.size.defaultW };
    }
    if (item.size.allowedW.includes(item.explicitWidth)) {
      return { item, w: item.explicitWidth };
    }
    const snapped = nearestAllowed(item.explicitWidth, item.size.allowedW);
    warnings.push({
      panelId: item.panel.id,
      message: `width ${item.explicitWidth} snapped to ${snapped}`,
    });
    return { item, w: snapped };
  });

  const rows: Array<typeof prepared> = [];
  let current: typeof prepared = [];
  let sum = 0;
  for (const entry of prepared) {
    if (current.length > 0 && sum + entry.w > GRID_WIDTH) {
      warnings.push({ message: 'row width exceeded 48 and was split' });
      rows.push(current);
      current = [entry];
      sum = entry.w;
    } else {
      current.push(entry);
      sum += entry.w;
    }
  }
  if (current.length > 0) {
    const rowSum = current.reduce((total, entry) => total + entry.w, 0);
    if (rowSum < GRID_WIDTH) {
      warnings.push({ message: 'row width is less than 48' });
    }
    rows.push(current);
  }

  return rows.map((group) => {
    const h = Math.max(...group.map((entry) => entry.item.size.h));
    let x = 0;
    return group.map((entry) => {
      const placed = { panel: entry.item.panel, x, w: entry.w, h };
      x += entry.w;
      return placed;
    });
  });
};

export const placeRow = (items: Placeable[], warnings: LayoutWarning[]): PlacedPanel[][] => {
  if (items.length === 0) {
    return [];
  }
  if (items.length === 1 && usesLoneDefaultWidth(items[0].panel) && items[0].explicitWidth === undefined) {
    return [placeLoneDefault(items[0], warnings)];
  }

  const allUnsized = items.every((item) => item.explicitWidth === undefined);
  if (allUnsized) {
    const split = splitUnsized(items);
    if (split.length > 1) {
      warnings.push({ message: 'row exceeded min width or max per row and was split' });
    }
    return split.map((group) => placeUnsizedGroup(group, warnings));
  }

  return placeExplicitItems(items, warnings);
};

const clonePanel = (panel: AttachmentPanel): AttachmentPanel => structuredClone(panel);

const indexDashboard = (
  dashboard: DashboardAttachmentData
): {
  panels: Map<string, AttachmentPanel>;
  sections: Map<string, DashboardSection>;
} => {
  const panels = new Map<string, AttachmentPanel>();
  const sections = new Map<string, DashboardSection>();
  for (const widget of dashboard.panels) {
    if (isSection(widget)) {
      sections.set(widget.id, widget);
      for (const panel of widget.panels) {
        panels.set(panel.id, panel);
      }
    } else {
      panels.set(widget.id, widget);
    }
  }
  return { panels, sections };
};

const resolveId = (ref: string, panelKeys: Map<string, string>): string =>
  panelKeys.get(ref) ?? ref;

const applyGrids = (placedRows: PlacedPanel[][], startY: number): { panels: AttachmentPanel[]; nextY: number; rowIds: string[][] } => {
  let y = startY;
  const panels: AttachmentPanel[] = [];
  const rowIds: string[][] = [];
  for (const row of placedRows) {
    const ids: string[] = [];
    for (const placed of row) {
      panels.push({
        ...clonePanel(placed.panel),
        grid: { x: placed.x, y, w: placed.w, h: placed.h },
      });
      ids.push(placed.panel.id);
    }
    if (ids.length > 0) {
      rowIds.push(ids);
      y += row[0].h;
    }
  }
  return { panels, nextY: y, rowIds };
};

const packUnsizedPanels = (
  panels: AttachmentPanel[],
  warnings: LayoutWarning[]
): PlacedPanel[][] => {
  const items: Placeable[] = panels.map((panel) => ({
    panel,
    size: getPanelLayoutSize(panel),
  }));
  const split = splitUnsized(items);
  return split.map((group) => placeUnsizedGroup(group, warnings));
};

const compileDeclared = (
  dashboard: DashboardAttachmentData,
  spec: { rows?: PanelRefInput[][]; sections?: SectionLayoutInput[] },
  panelKeys: Map<string, string>
): CompileLayoutResult => {
  const { panels: panelIndex, sections: sectionIndex } = indexDashboard(dashboard);
  const used = new Set<string>();
  const mentionedSections = new Set<string>();
  const warnings: LayoutWarning[] = [];
  const failures: PanelFailure[] = [];
  const mintedKeys = new Map<string, string>();

  const takePanel = (rawRef: string): AttachmentPanel | undefined => {
    const id = resolveId(rawRef, panelKeys);
    if (used.has(id)) {
      failures.push({
        type: DASHBOARD_OPERATION_FAILURE_TYPES.setLayout,
        identifier: rawRef,
        error: `Panel "${rawRef}" is referenced more than once.`,
      });
      return undefined;
    }
    const panel = panelIndex.get(id);
    if (!panel) {
      failures.push({
        type: DASHBOARD_OPERATION_FAILURE_TYPES.setLayout,
        identifier: rawRef,
        error: `Panel "${rawRef}" was not found.`,
      });
      return undefined;
    }
    used.add(id);
    return panel;
  };

  const compileRows = (rows: PanelRefInput[][]): PlacedPanel[][] => {
    const placed: PlacedPanel[][] = [];
    for (const row of rows) {
      const items: Placeable[] = [];
      for (const raw of row) {
        const parsed = parseRef(raw);
        const panel = takePanel(parsed.ref);
        if (!panel) {
          continue;
        }
        items.push({
          panel,
          explicitWidth: parsed.width,
          size: getPanelLayoutSize(panel),
        });
      }
      placed.push(...placeRow(items, warnings));
    }
    return placed;
  };

  const topPlaced = compileRows(spec.rows ?? []);
  let y = 0;
  const topApplied = applyGrids(topPlaced, y);
  y = topApplied.nextY;
  const widgets: Array<AttachmentPanel | DashboardSection> = [...topApplied.panels];
  const topRowIds = topApplied.rowIds;

  for (const entry of spec.sections ?? []) {
    let existing: DashboardSection | undefined;
    if (entry.ref) {
      const id = resolveId(entry.ref, panelKeys);
      existing = sectionIndex.get(id);
      if (!existing) {
        failures.push({
          type: DASHBOARD_OPERATION_FAILURE_TYPES.setLayout,
          identifier: entry.ref,
          error: `Section "${entry.ref}" was not found.`,
        });
        continue;
      }
      mentionedSections.add(existing.id);
    }

    const sectionRows = compileRows(entry.rows);
    const applied = applyGrids(sectionRows, 0);

    let section: DashboardSection;
    if (existing) {
      section = {
        ...existing,
        title: entry.title ?? existing.title,
        collapsed: entry.collapsed ?? existing.collapsed,
        grid: { y },
        panels: applied.panels,
      };
    } else {
      const id = uuidv4();
      if (entry.key) {
        mintedKeys.set(entry.key, id);
        panelKeys.set(entry.key, id);
      }
      mentionedSections.add(id);
      section = {
        id,
        title: entry.title ?? '',
        collapsed: entry.collapsed ?? false,
        grid: { y },
        panels: applied.panels,
      };
    }

    if (section.panels.length === 0) {
      continue;
    }
    widgets.push(section);
    y += 1;
  }

  for (const widget of dashboard.panels) {
    if (!isSection(widget) || mentionedSections.has(widget.id)) {
      continue;
    }
    const remaining = widget.panels.filter((panel) => !used.has(panel.id));
    if (remaining.length === 0) {
      continue;
    }
    remaining.forEach((panel) => used.add(panel.id));
    const keptRows = packUnsizedPanels(remaining, warnings);
    const applied = applyGrids(keptRows, 0);
    widgets.push({
      ...widget,
      grid: { y },
      panels: applied.panels,
    });
    y += 1;
  }

  const unreferenced = [...panelIndex.values()]
    .filter((panel) => !used.has(panel.id))
    .sort((a, b) => a.grid.y - b.grid.y || a.grid.x - b.grid.x);

  if (unreferenced.length > 0) {
    for (const panel of unreferenced) {
      warnings.push({ panelId: panel.id, message: UNPLACED_WARNING });
    }
    const packed = packUnsizedPanels(unreferenced, warnings);
    const applied = applyGrids(packed, y);
    widgets.push(...applied.panels);
    topRowIds.push(...applied.rowIds);
  }

  return {
    dashboard: { ...dashboard, panels: widgets },
    rows: topRowIds,
    warnings,
    failures,
    mintedKeys,
  };
};

const compileImplicit = (
  dashboard: DashboardAttachmentData,
  implicitPanelIds: string[]
): CompileLayoutResult => {
  const warnings: LayoutWarning[] = [];
  const unspecified = new Set(implicitPanelIds);
  const { panels: panelIndex } = indexDashboard(dashboard);

  const kept: Array<AttachmentPanel | DashboardSection> = [];
  for (const widget of dashboard.panels) {
    if (isSection(widget)) {
      const panels = widget.panels.filter((panel) => !unspecified.has(panel.id));
      if (panels.length === 0) {
        continue;
      }
      kept.push({ ...widget, panels });
      continue;
    }
    if (!unspecified.has(widget.id)) {
      kept.push(widget);
    }
  }

  const implicitPanels = implicitPanelIds
    .map((id) => panelIndex.get(id))
    .filter((panel): panel is AttachmentPanel => panel !== undefined);

  const packed = packUnsizedPanels(implicitPanels, warnings);
  const startY = getWidgetsBottomY(kept);
  const applied = applyGrids(packed, startY);

  return {
    dashboard: { ...dashboard, panels: [...kept, ...applied.panels] },
    rows: deriveRowsFromGrid({ ...dashboard, panels: [...kept, ...applied.panels] }).rows,
    warnings,
    failures: [],
    mintedKeys: new Map(),
  };
};

export const compileLayout = ({
  dashboard,
  spec,
  panelKeys,
}: CompileLayoutParams): CompileLayoutResult => {
  if (isImplicitSpec(spec)) {
    return compileImplicit(dashboard, spec.implicitPanelIds);
  }
  if (spec.auto === true) {
    const derived = deriveRowsFromGrid(dashboard);
    return compileDeclared(dashboard, derived, panelKeys);
  }
  return compileDeclared(dashboard, { rows: spec.rows, sections: spec.sections }, panelKeys);
};
