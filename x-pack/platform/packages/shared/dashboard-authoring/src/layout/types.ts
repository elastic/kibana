/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const GRID_COLUMNS = 48;

export interface PanelSize {
  w: number;
  h: number;
}

/** A panel as the layout step sees it. */
export interface LayoutPanel {
  kind: 'panel';
  id: string;
  /** Embeddable type, e.g. `lens` or `markdown`. */
  type: string;
  /** Lens chart type, e.g. `metric` or `xy`, when known. */
  chartType?: string;
  title?: string;
  /** One-sentence description of what the panel shows, when the panel was authored this turn. */
  authoringNote?: string;
  size: PanelSize;
  /** Added in this call, or moved into this container. */
  isNew: boolean;
  /** Sized explicitly in this call; the layout keeps its size. */
  fixedSize: boolean;
}

/** A section as an item of the top-level container. */
export interface LayoutSectionItem {
  kind: 'section';
  id: string;
  title: string;
  isNew: boolean;
}

/**
 * A grid to arrange: the top level (`section: null`), which holds top-level panels and sections, or
 * a section, which holds its panels. Items are listed in their current reading order.
 */
export interface LayoutContainer {
  section: string | null;
  title?: string;
  items: Array<LayoutPanel | LayoutSectionItem>;
}

export interface LayoutRequest {
  dashboardTitle: string;
  dashboardDescription?: string;
  /** Layout instructions from the user, when the call asked for a relayout. */
  instructions?: string;
  containers: LayoutContainer[];
}

const rowItemSchema = z.object({
  id: z.string().max(256).describe('Id of a panel or section in this container.'),
  w: z
    .number()
    .int()
    .min(1)
    .max(GRID_COLUMNS)
    .describe('Panel width in grid columns. Ignored for sections.'),
});

const rowSchema = z.object({
  h: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe('Height of the panels in this row, in grid rows. Ignored for sections.'),
  items: z
    .array(rowItemSchema)
    .min(1)
    .max(GRID_COLUMNS)
    .describe('Items left to right. Widths should add up to 48.'),
});

/** Rows per container returned by the layout step. Code turns them into grid positions. */
export const layoutArrangementSchema = z.object({
  containers: z
    .array(
      z.object({
        section: z
          .string()
          .max(256)
          .nullable()
          .describe('Section id of the container, or null for the top level.'),
        rows: z.array(rowSchema).max(200).describe('Rows top to bottom.'),
      })
    )
    .max(200),
});

export type LayoutArrangement = z.infer<typeof layoutArrangementSchema>;

/**
 * Arranges the containers of a layout request into rows. Injected by the host, which runs it as a
 * separate model call. Errors and invalid output fall back to a deterministic layout.
 */
export type ArrangeDashboardLayout = (request: LayoutRequest) => Promise<LayoutArrangement>;
