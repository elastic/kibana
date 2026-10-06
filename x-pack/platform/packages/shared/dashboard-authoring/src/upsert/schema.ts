/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { timeRangeSchema } from '@kbn/agent-builder-dashboards-common';
import { controlInputSchema } from '../controls';
import { upsertPanelContentSchema } from '../panels';
import { GRID_COLUMNS } from '../layout';

const metadataSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe(
      "Non-empty dashboard title. If the current title is empty, missing, or a placeholder, invent one from the dashboard's contents."
    ),
  description: z.string().max(2048).optional(),
  time_range: timeRangeSchema
    .optional()
    .describe(
      'Override the dashboard time range. ONLY set this when the user explicitly requested a specific time window (e.g. "show the last 7 days", "set time range to May 20–24"). Do NOT set it otherwise — a data-aware default is applied automatically. Convert natural language to Kibana date math or ISO 8601: "last 30 minutes" → { from: "now-30m", to: "now" }, "last 90 days" → { from: "now-90d", to: "now" }, "May 20–24" → { from: "2024-05-20T00:00:00.000Z", to: "2024-05-24T23:59:59.999Z", mode: "absolute" }.'
    ),
});

const idSchema = z.string().min(1).max(256);

const upsertSectionSchema = z.object({
  id: idSchema.describe(
    'Section id. An existing section id updates that section; a new id creates a section with this id. Use a short readable slug for new sections, e.g. "key-metrics".'
  ),
  title: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe('Section title. Required for new sections.'),
  collapsed: z
    .boolean()
    .optional()
    .describe('Whether the section is collapsed. Defaults to false.'),
});

const panelSizeSchema = z
  .object({
    w: z.number().int().min(1).max(GRID_COLUMNS).describe('Width in grid columns (1–48).'),
    h: z.number().int().min(1).max(100).describe('Height in grid rows.'),
  })
  .describe(
    'Explicit panel size. Set it only when the user asks for a specific size (e.g. "make it full width"); otherwise the layout step sizes the panel. Position always comes from the layout step.'
  );

const upsertPanelSchema = z.object({
  id: idSchema.describe(
    'Panel id. An existing panel id updates that panel; a new id creates a panel with this id. Use a short readable slug for new panels, e.g. "error-rate-trend".'
  ),
  section: idSchema
    .nullable()
    .optional()
    .describe(
      'Section id to place the panel in, or null for the top level. Omit to keep an existing panel where it is; new panels go to the top level when omitted.'
    ),
  content: upsertPanelContentSchema
    .optional()
    .describe(
      'Panel content. Required for new panels. For an existing panel of the same kind, edits it (e.g. a request with a query describing the change). Content of a different kind, or an attachment, replaces the panel content and keeps its id. Omit to only move or resize the panel.'
    ),
  grid: panelSizeSchema.optional(),
});

/**
 * The desired changes to a dashboard, keyed by id: metadata, sections, panels and controls to
 * create or update, ids to remove, and optional layout instructions.
 */
export const upsertDashboardSchema = z.object({
  set: metadataSchema
    .optional()
    .describe('Dashboard metadata to set. A new dashboard requires a title.'),
  sections: z
    .array(upsertSectionSchema)
    .max(50)
    .optional()
    .describe(
      'Sections to create or update. Sections group related panels under a collapsible title.'
    ),
  panels: z
    .array(upsertPanelSchema)
    .max(100)
    .optional()
    .describe(
      'Panels to create, edit, move, or resize, by id. Panels you leave out stay unchanged.'
    ),
  controls: z
    .array(controlInputSchema)
    .max(20)
    .optional()
    .describe(
      'Controls to add. Use options_list_control for categorical/keyword fields, range_slider_control for numeric fields, time_slider_control for time sub-range filtering (at most one per dashboard).'
    ),
  remove: z
    .array(idSchema)
    .max(200)
    .optional()
    .describe(
      'Ids of panels, sections, or controls to remove. Removing a section also removes the panels still in it; move panels you want to keep with `panels[].section` first.'
    ),
  layout: z
    .string()
    .max(2048)
    .optional()
    .describe(
      'Layout instructions from the user, e.g. "put the metrics in one row" or "order the sections by importance". Arranges the whole dashboard again. Omit it otherwise: new, moved, and removed panels are placed automatically.'
    ),
});

export type DashboardUpsert = z.infer<typeof upsertDashboardSchema>;

export type UpsertPanelItem = NonNullable<DashboardUpsert['panels']>[number];

export type UpsertSectionItem = NonNullable<DashboardUpsert['sections']>[number];

/** Whether an upsert can create a new dashboard, which requires a non-blank title. */
export const hasValidNewDashboardMetadata = ({ set }: DashboardUpsert): boolean =>
  set?.title !== undefined && set.title.trim().length > 0;
