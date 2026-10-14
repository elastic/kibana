/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const GRID_COLUMNS = 48;

/** Size of a new panel until the layout call places it. */
export const DEFAULT_PANEL_SIZE = { w: 24, h: 10 } as const;

/** A panel as the layout call sees it. */
export interface LayoutPanel {
  id: string;
  /** Embeddable type, e.g. `lens` or `markdown`. */
  type: string;
  /** Lens chart type, e.g. `metric` or `xy`, when known. */
  chartType?: string;
  title?: string;
  /** What the panel shows, when the panel was authored in this call. */
  authoringNote?: string;
  /** Length of the text of a markdown panel. */
  markdownLength?: number;
  grid: { x: number; y: number; w: number; h: number };
  /** Added in this call. */
  isNew: boolean;
  /** Content edited in this call, so its size may no longer fit. */
  contentChanged: boolean;
}

export interface LayoutSection {
  id: string;
  title: string;
  y: number;
  isNew: boolean;
  /** Panels of the section, with coordinates relative to the section. */
  panels: LayoutPanel[];
}

export interface LayoutRequest {
  dashboardTitle: string;
  dashboardDescription?: string;
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
