/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const GRID_COLUMNS = 48;

/** A panel as the layout call sees it. */
export interface LayoutPanel {
  id: string;
  /** Embeddable type, e.g. `lens` or `markdown`. */
  type: string;
  /** Lens chart type, e.g. `metric` or `xy`, when known. */
  chartType?: string;
  title?: string;
  /** What the panel shows when it was authored in this call, or the text size of a markdown panel. */
  authoringNote?: string;
  grid: { x: number; y: number; w: number; h: number };
  /** Which parts of `grid` to set again; omitted when the panel keeps its grid. */
  relayout?: Relayout;
}

/**
 * `all` for a panel added in this call, or moved and edited; `position` for a panel moved to
 * another container, whose position is temporary; `size` for a panel whose content was edited.
 */
export type Relayout = 'all' | 'position' | 'size';

export interface LayoutSection {
  id: string;
  title: string;
  y: number;
  /** Panels of the section, with coordinates relative to the section. */
  panels: LayoutPanel[];
}

export interface LayoutRequest {
  /** The user's own arrangement or size request. */
  instructions?: string;
  panels: LayoutPanel[];
  sections: LayoutSection[];
}

/** Grid positions returned by the layout call. */
export const layoutArrangementSchema = z.object({
  panels: z
    .array(
      z.object({
        id: z.string().max(256),
        x: z
          .number()
          .int()
          .min(0)
          .max(GRID_COLUMNS - 1),
        y: z.number().int().min(0).max(1000),
        w: z.number().int().min(1).max(GRID_COLUMNS),
        h: z.number().int().min(1).max(100),
      })
    )
    .max(500)
    .describe('Every panel, top level and in sections. Section panels use section-relative y.'),
  sections: z
    .array(z.object({ id: z.string().max(256), y: z.number().int().min(0).max(1000) }))
    .max(100)
    .describe('Every section, with its row in the top-level grid.'),
});

export type LayoutArrangement = z.infer<typeof layoutArrangementSchema>;

/** Arranges the dashboard with a separate model call. Injected by the host. */
export type ArrangeDashboardLayout = (request: LayoutRequest) => Promise<LayoutArrangement>;
