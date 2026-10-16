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
  /** The text of a markdown panel, or the config of a custom content panel, to size it by. */
  content?: string;
  /** Omitted for a panel added to its container in this call, which the layout call places. */
  grid?: { x: number; y: number; w: number; h: number };
  /** Set instead of `grid` for a panel moved here from another container: the size it had there. */
  size?: { w: number; h: number };
}

export interface LayoutSection {
  id: string;
  title: string;
  /** Omitted for a section added in this call. */
  y?: number;
  /**
   * Panels of the section; grids are relative to the section. Omitted for a section that keeps its
   * layout.
   */
  panels?: LayoutPanel[];
}

/** The dashboard as it is after the operations, with the grids of the panels already placed. */
export interface LayoutRequest {
  /** Where panels and sections go, from the user or the authoring agent. */
  instructions?: string;
  panels: LayoutPanel[];
  sections: LayoutSection[];
}

const arrangedPanelsSchema = z
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
  .max(500);

/** Grid positions returned by the layout call, in the containers of the request. */
export const layoutArrangementSchema = z.object({
  plan: z
    .string()
    .describe(
      'Written before the grids: per container, the rows you change and why, then each changed row as `w×h` per panel. Check that the widths of every row add up to 48 and that panels side by side end on the same row.'
    ),
  panels: arrangedPanelsSchema.describe('Every top-level panel.'),
  sections: z
    .array(
      z.object({
        id: z.string().max(256),
        y: z.number().int().min(0).max(1000),
        panels: arrangedPanelsSchema.describe(
          'Every panel of this section, with section-relative coordinates.'
        ),
      })
    )
    .max(100)
    .describe('Every section, with its row in the top-level grid.'),
});

export type LayoutArrangement = z.infer<typeof layoutArrangementSchema>;

/**
 * Arranges the dashboard with a separate model call. Injected by the host, which parses the answer
 * with `layoutArrangementSchema`.
 */
export type ArrangeDashboardLayout = (request: LayoutRequest) => Promise<LayoutArrangement>;
