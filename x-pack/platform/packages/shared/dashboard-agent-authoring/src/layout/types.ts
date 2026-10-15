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
  /** Set on the panels of the previous dashboard only. */
  grid?: { x: number; y: number; w: number; h: number };
}

export interface LayoutSection {
  id: string;
  title: string;
  /** Set on the sections of the previous dashboard only. */
  y?: number;
  /** Panels of the section; grids are relative to the section. */
  panels: LayoutPanel[];
}

export interface LayoutDashboard {
  panels: LayoutPanel[];
  sections: LayoutSection[];
}

/** Ids of the panels and sections that changed since the previous dashboard. */
export interface LayoutChanges {
  addedPanels?: string[];
  removedPanels?: string[];
  /** Panels now in another container. */
  movedPanels?: string[];
  /** Panels whose chart type or content changed. */
  editedPanels?: string[];
  addedSections?: string[];
  removedSections?: string[];
}

export interface LayoutRequest {
  /** Where panels and sections go, from the user or the authoring agent. */
  instructions?: string;
  /** The dashboard before this call, with its grids; omitted for a new dashboard. */
  previous?: LayoutDashboard;
  /** The dashboard after this call, without grids. */
  current: LayoutDashboard;
  changes: LayoutChanges;
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

/** Grid positions returned by the layout call, in the containers of the current dashboard. */
export const layoutArrangementSchema = z.object({
  plan: z
    .string()
    .max(4000)
    .describe(
      'Written before the grids: per container, the rows that change and why, then each changed row as its panels with `w` and `h`. Check that the widths of every row add up to 48 and that panels side by side end on the same row.'
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

/** Arranges the dashboard with a separate model call. Injected by the host. */
export type ArrangeDashboardLayout = (request: LayoutRequest) => Promise<LayoutArrangement>;
