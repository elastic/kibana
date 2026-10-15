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
  /** Approximate grid rows the content needs at half width, for markdown and custom content panels. */
  preferredHeight?: number;
  grid: { x: number; y: number; w: number; h: number };
  /** Which parts of `grid` to set again; omitted when the panel keeps its grid. */
  relayout?: Relayout;
}

/**
 * `all` for a panel added in this call, or moved with a new chart type or preferred height;
 * `position` for a panel moved to another container, which keeps its size but not its temporary
 * position; `size` for a panel whose chart type or preferred height changed, which keeps its
 * position.
 */
export type Relayout = 'all' | 'position' | 'size';

export interface LayoutSection {
  id: string;
  title: string;
  y: number;
  /** `position` for a section added in this call, whose `y` is temporary; omitted otherwise. */
  relayout?: Extract<Relayout, 'position'>;
  /** Set when panels were moved out of the section or removed from it, leaving holes. */
  reflow?: boolean;
  /** Panels of the section, with coordinates relative to the section. */
  panels: LayoutPanel[];
}

export interface LayoutRequest {
  /** Where panels and sections go, from the user or the authoring agent. */
  instructions?: string;
  /** Set when top-level panels were moved into a section or removed, leaving holes. */
  reflow?: boolean;
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
