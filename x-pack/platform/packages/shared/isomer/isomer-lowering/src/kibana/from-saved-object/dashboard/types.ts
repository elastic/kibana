/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Minimal types for the Kibana dashboard saved-object `attributes` shape.
// As with the Lens types, we describe just what the lowering reads so the
// adapter survives forward-compatible additions to Kibana.

export interface DashboardAttributes {
  title: string;
  description?: string;
  /** Stringified array of `DashboardPanel`. */
  panelsJSON: string;
  timeRestore?: boolean;
  timeFrom?: string;
  timeTo?: string;
  kibanaSavedObjectMeta?: {
    /** Stringified `{ query?: { query, language }, filter?: Filter[] }`. */
    searchSourceJSON?: string;
  };
}

export interface DashboardPanel {
  version?: string;
  /**
   * Embeddable type. `lens` and Kibana 9.4's `vis` are Lens; `visualization`
   * and `legacy_vis` are aggregation-based visualizations.
   */
  type: string;
  panelIndex?: string;
  /**
   * Stable id within the dashboard; some Kibana versions write `i` on
   * `gridData` and rely on it as the panel id, others write `panelIndex`.
   */
  gridData?: {
    x: number;
    y: number;
    w: number;
    h: number;
    i?: string;
  };
  /**
   * When set, the actual saved-object id is in the dashboard's `references`
   * array under this name; otherwise the panel's embeddable config carries
   * an inline `savedVis` / `attributes` blob.
   */
  panelRefName?: string;
  /** Display title override (e.g. dashboard-level rename of a panel). */
  title?: string;
  /** When true, Kibana hides this panel's title bar entirely. */
  hidePanelTitles?: boolean;
  /** Panel-local config overrides; we only read `attributes` for Lens. */
  embeddableConfig?: {
    attributes?: unknown;
    enhancements?: unknown;
    savedVis?: unknown;
    /**
     * Custom panel title. Newer Kibana panel configs store the dashboard
     * rename here instead of at the top-level {@link DashboardPanel.title}.
     */
    title?: unknown;
    /** Per-panel title visibility, mirroring {@link DashboardPanel.hidePanelTitles}. */
    hidePanelTitles?: unknown;
    [extra: string]: unknown;
  };
}

export interface DashboardSearchSource {
  query?: { query: string; language?: string };
  filter?: Array<Record<string, unknown>>;
}
