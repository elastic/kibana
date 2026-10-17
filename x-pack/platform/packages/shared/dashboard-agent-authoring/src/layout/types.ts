/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/as-code-dashboard-schema';

export interface LayoutGrid {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What a panel shows, which decides the size it needs. */
export interface LayoutPanelKind {
  /** Embeddable type, e.g. `lens` or `markdown`. */
  type: string;
  /** Lens chart type, e.g. `metric` or `xy`, when known. */
  chartType?: string;
}

/** A panel as the layout call sees it. */
export interface LayoutPanel extends LayoutPanelKind {
  id: string;
  title?: string;
  /** Set for a panel whose kind changed in this call: the kind its current grid was sized for. */
  retypedFrom?: LayoutPanelKind;
  /** The text of a markdown panel, or the config of a custom content panel, to size it by. */
  content?: string;
  /** Omitted for a panel added to its container in this call, which the layout call places. */
  grid?: LayoutGrid;
  /** Set instead of `grid` for a panel moved here from another container: the size it had there. */
  size?: { w: number; h: number };
}

export interface LayoutSection {
  id: string;
  title: string;
  /** Omitted for a section added in this call. */
  y?: number;
  /** Panels of the section; grids are relative to the section. */
  panels: LayoutPanel[];
  /** The space that panels removed from the section, or moved out of it, left there. */
  removed?: LayoutGrid[];
}

/** The dashboard as it is after the operations, with the grids of the panels already placed. */
export interface LayoutRequest {
  /** Where panels and sections go, from the user or the authoring agent. */
  instructions?: string;
  panels: LayoutPanel[];
  /** The space that top-level panels removed, or moved out of it, left in the top level. */
  removed?: LayoutGrid[];
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
        .max(DASHBOARD_GRID_COLUMN_COUNT - 1),
      y: z.number().int().min(0).max(1000),
      w: z.number().int().min(1).max(DASHBOARD_GRID_COLUMN_COUNT),
      h: z.number().int().min(1).max(100),
    })
  )
  .max(500);

/** The answer of the layout call: grid positions in the containers of the request. */
export const layoutArrangementSchema = z.object({
  plan: z.string(),
  panels: arrangedPanelsSchema,
  sections: z
    .array(
      z.object({
        id: z.string().max(256),
        y: z.number().int().min(0).max(1000),
        panels: arrangedPanelsSchema,
      })
    )
    .max(100),
});

export type LayoutArrangement = z.infer<typeof layoutArrangementSchema>;

/**
 * Arranges the dashboard with a separate model call. Injected by the host, which reads the answer
 * with `parseLayoutAnswer`.
 */
export type ArrangeDashboardLayout = (request: LayoutRequest) => Promise<LayoutArrangement>;
