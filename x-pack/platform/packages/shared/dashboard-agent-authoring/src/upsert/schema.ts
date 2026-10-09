/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { panelGridSchema, timeRangeSchema } from '@kbn/agent-builder-dashboards-common';
import { controlInputSchema } from '../controls';
import { upsertPanelContentSchema } from '../operations/panels';

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
  grid: panelGridSchema
    .optional()
    .describe(
      "Panel position and size in its container (48-column grid; positions in a section are relative to the section). Required for new panels; for existing panels, replaces the grid when set. When omitted, an existing panel keeps its grid, or, when it moves to another container, is placed below that container's panels."
    ),
});

/**
 * The desired changes to a dashboard, keyed by id: dashboard fields, and sections, panels and
 * controls to create or update, and ids to remove.
 */
export const upsertDashboardSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe(
      'Dashboard title. Required for a new dashboard. If the current title is empty, missing, or a placeholder such as "User Dashboard", invent one from the dashboard\'s contents.'
    ),
  description: z.string().max(2048).optional().describe('Dashboard description. "" clears it.'),
  time_range: timeRangeSchema
    .optional()
    .describe(
      'Override the dashboard time range. ONLY set this when the user explicitly requested a specific time window (e.g. "show the last 7 days", "set time range to May 20–24"). Do NOT set it otherwise — a data-aware default is applied automatically. Convert natural language to Kibana date math or ISO 8601: "last 30 minutes" → { from: "now-30m", to: "now" }, "last 90 days" → { from: "now-90d", to: "now" }, "May 20–24" → { from: "2024-05-20T00:00:00.000Z", to: "2024-05-24T23:59:59.999Z", mode: "absolute" }.'
    ),
  sections: z
    .array(upsertSectionSchema)
    .max(50)
    .optional()
    .describe(
      'Sections to create or update. Sections group related panels under a collapsible title. New sections are added below all other widgets, in the order listed.'
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
      'Ids of panels, sections, or controls to remove. Removing a section also removes the panels still in it; to keep some, move them in the same call with `panels[].section` (null for the top level). A section is kept when a panel listed to move out of it cannot be moved.'
    ),
});

export type DashboardUpsert = z.infer<typeof upsertDashboardSchema>;

export type UpsertPanelItem = NonNullable<DashboardUpsert['panels']>[number];

export type UpsertSectionItem = NonNullable<DashboardUpsert['sections']>[number];

/** Whether an upsert can create a new dashboard, which requires a non-blank title. */
export const hasValidNewDashboardMetadata = ({ title }: DashboardUpsert): boolean =>
  title !== undefined && title.trim().length > 0;
