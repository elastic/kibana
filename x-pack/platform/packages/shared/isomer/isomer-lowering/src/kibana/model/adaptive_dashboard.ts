/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptiveLens } from './adaptive_lens';
import type { AdaptiveQuery, Filter, TimeRange } from './adaptive_query';
import type { ValueFormatter } from './formatter';

// Re-export from adaptive_query for convenience.
export type { TimeRange, Filter } from './adaptive_query';

// The `unsupported` variant is the safe degradation for panels the converter cannot represent.

export interface AdaptivePanelLinkItem {
  label: string;
  href: string;
  /**
   * Optional sub-text rendered under the label.
   */
  description?: string;
}

export interface AdaptiveSavedSearchColumn {
  id: string;
  label: string;
  align?: 'left' | 'right';
  format?: ValueFormatter;
}

export type AdaptivePanel =
  | { type: 'lens'; lens: AdaptiveLens }
  | { type: 'markdown'; body: string; title?: string }
  | { type: 'image'; src: string; alt?: string; caption?: string }
  | { type: 'links'; items: AdaptivePanelLinkItem[]; title?: string }
  | {
      type: 'savedSearch';
      title: string;
      query: AdaptiveQuery;
      columns: AdaptiveSavedSearchColumn[];
    }
  | {
      type: 'maps';
      title: string;
      snapshot?: { src: string; alt: string };
      deepLink: string;
    }
  | { type: 'vega'; title: string; mode: 'vega' | 'vega-lite'; spec: Record<string, unknown> }
  | { type: 'unsupported'; reason: string; deepLink?: string; title?: string };

export type { AdaptiveSavedSearchColumn as SavedSearchColumnRef };

export interface AdaptiveDashboardGridItem {
  panelIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Kibana dashboard canvas is a fixed 48-column grid. */
export const KIBANA_DASHBOARD_GRID_COLUMNS = 48;
/** Kibana's default panel track height in pixels. */
export const KIBANA_DASHBOARD_ROW_HEIGHT = 20;

export interface AdaptiveDashboard {
  id: string;
  title: string;
  subtitle?: string;
  timeRange?: TimeRange;
  filters?: Filter[];
  /**
   * Flat, ordered panel list. Renderers may reflow these into a single
   * column on mobile or into the grouping suggested by `layoutHint.rows`.
   */
  panels: AdaptivePanel[];
  /**
   * Optional desktop row grouping. Each entry is an array of `panels`
   * indices that should appear in the same horizontal row.
   */
  layoutHint?: {
    rows: number[][];
    grid?: {
      columns: number;
      rowHeight?: number;
      items: AdaptiveDashboardGridItem[];
    };
  };
  provenance?: {
    source: string;
    kibanaUrl?: string;
    savedObjectId?: string;
  };
}
