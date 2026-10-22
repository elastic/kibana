/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The stable, long-lived per-panel shape of a dashboard saved object's `panelsJSON` (a JSON
 * *string* on the saved object attribute, parsed by the caller) -- `{x,y,w,h,i}` in grid
 * units, unchanged since Kibana 7.x for saved-object export/import compatibility. See e.g.
 * `x-pack/platform/test/functional/fixtures/kbn_archives/reporting/logs.json`'s
 * `panelsJSON` for a real example.
 */
export interface DashboardPanelGridData {
  x: number;
  y: number;
  w: number;
  h: number;
  i: string;
}

export interface DashboardPanelLayout {
  panelIndex: string;
  gridData: DashboardPanelGridData;
  title?: string;
  /**
   * The embeddable's saved-object type (e.g. `'lens'`, `'search'`, `'map'`), read straight
   * off `panelsJSON`'s own per-entry `type` field (see e.g. the `"search"`/`"lens"` entries
   * in `x-pack/platform/test/functional/fixtures/kbn_archives/reporting/logs.json`'s
   * `panelsJSON`) -- no `references` cross-lookup needed. Used by `render_dashboard_report.ts`
   * to dispatch `'map'` panels to `render_map_panel.ts`'s native MapLibre renderer instead of
   * the generic DOM/canvas sink (see that module's doc comment for why).
   */
  type?: string;
  /** The embeddable's saved-object id, resolved from the dashboard's own `references` array via `panelRefName` (see `resolve_dashboard_panels.ts`); absent for a by-value panel. */
  savedObjectId?: string;
}

export interface PanelPixelPosition {
  panelIndex: string;
  title?: string;
  type?: string;
  savedObjectId?: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GridPixelConfig {
  /** The dashboard grid container's measured/configured width, in CSS pixels. */
  containerWidthPx: number;
  /**
   * Grid column count, row height, and gutter size, in px. Mirror the dashboard plugin's
   * `DASHBOARD_GRID_COLUMN_COUNT` (48, exported from `@kbn/dashboard-plugin/public`) and
   * `@kbn/grid-layout`'s `DASHBOARD_GRID_HEIGHT`/`DASHBOARD_MARGIN_SIZE` constants (`20`/`8`,
   * not exported from either plugin's public surface). Duplicated here rather than
   * depending on the dashboard plugin (a `browser`+`server` plugin) from this server-only
   * worker package just for three constants -- see the package README's shim/finding
   * inventory for the drift risk this carries if those constants ever change.
   */
  columnCount?: number;
  rowHeightPx?: number;
  gutterSizePx?: number;
}

const DEFAULT_COLUMN_COUNT = 48;
const DEFAULT_ROW_HEIGHT_PX = 20;
const DEFAULT_GUTTER_SIZE_PX = 8;

/**
 * Computes each panel's absolute pixel position the same way `@kbn/grid-layout` does
 * (`grid-template-columns: repeat(columnCount, (100% - gutter*(columnCount-1)) / columnCount)`,
 * `gap`/`padding` both equal to the gutter size -- see `grid_layout.tsx`'s `styles.layout`),
 * rather than by measuring the DOM: jsdom has no CSS Grid layout engine at all, so a
 * dashboard's real `[data-shared-item]` elements always report an all-zero
 * `getBoundingClientRect()` (unlike `get_element_position_data.ts`'s Chromium-driven
 * equivalent, which can read real browser-computed positions directly). This is the
 * "dashboard gridData to px" mechanism the plan calls out explicitly.
 *
 * Deliberately scoped to a single, unsectioned grid (no collapsible dashboard sections):
 * every panel is positioned against one `containerWidthPx`/`rowHeightPx` pair. A dashboard
 * using collapsible sections needs its own per-section origin offset, not yet implemented
 * -- tracked as a Phase 4 finding if a Tier 5 verification dashboard needs one.
 */
export const computePanelPixelPositions = (
  panels: DashboardPanelLayout[],
  {
    containerWidthPx,
    columnCount = DEFAULT_COLUMN_COUNT,
    rowHeightPx = DEFAULT_ROW_HEIGHT_PX,
    gutterSizePx = DEFAULT_GUTTER_SIZE_PX,
  }: GridPixelConfig
): PanelPixelPosition[] => {
  // `@kbn/grid-layout`'s container has `padding: gutterSizePx` on every side, and CSS Grid
  // resolves `grid-template-columns`' percentages against the *content* box (padding
  // already subtracted) -- so the width available to spread across columns/gutters is
  // `containerWidthPx` minus the left+right padding, not `containerWidthPx` itself.
  const contentWidthPx = containerWidthPx - gutterSizePx * 2;
  const columnWidthPx = (contentWidthPx - gutterSizePx * (columnCount - 1)) / columnCount;

  return panels.map(({ panelIndex, gridData, title, type, savedObjectId }) => ({
    panelIndex,
    title,
    type,
    savedObjectId,
    left: gutterSizePx + gridData.x * (columnWidthPx + gutterSizePx),
    top: gutterSizePx + gridData.y * (rowHeightPx + gutterSizePx),
    width: gridData.w * columnWidthPx + (gridData.w - 1) * gutterSizePx,
    height: gridData.h * rowHeightPx + (gridData.h - 1) * gutterSizePx,
  }));
};

/** The full page's pixel size for a dashboard's grid: content width plus the gutter used as padding on both edges, and the tallest panel's bottom edge plus the bottom gutter. */
export const computePageSize = (
  positions: PanelPixelPosition[],
  { containerWidthPx, gutterSizePx = DEFAULT_GUTTER_SIZE_PX }: GridPixelConfig
): { width: number; height: number } => {
  const height =
    positions.length === 0
      ? gutterSizePx * 2
      : Math.max(...positions.map((p) => p.top + p.height)) + gutterSizePx;
  return { width: containerWidthPx, height };
};
