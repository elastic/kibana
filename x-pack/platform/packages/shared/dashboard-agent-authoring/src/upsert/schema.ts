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
    'Panel id. An existing panel id updates that panel; a new id creates a panel with this id. Use a short readable slug for new panels, e.g. "error-rate-trend". List each panel once; to move and edit a panel, set `section` and `content` in the same item. Ids are handles that never change: read panel titles for what a panel shows.'
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
      'Panel content. Required for new panels. For an existing panel, edits it in place and must match its kind. Prefer an edit to removing and re-adding the panel. For a request edit, put only the requested change in query (e.g. "make the error series blue"); unrelated settings are kept. To change the kind, remove the panel and add a new one with a new id. DSL, form-based, and other non-ES|QL Lens panels cannot be edited; they can only be replaced with a new panel. Omit to only move the panel.'
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
  description: z
    .string()
    .max(2048)
    .optional()
    .describe(
      'Short summary of what the dashboard shows. Set it when creating a dashboard. "" clears it.'
    ),
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
      'Sections to create or update. Sections group related panels under a collapsible title. Group panels by purpose, and order sections as summary metrics, then trends, then breakdowns, or use one section per domain with that order inside it. A section holds only panels of its purpose. Use sections for roughly 6 or more visualization panels; keep smaller dashboards flat.'
    ),
  panels: z
    .array(upsertPanelSchema)
    .max(100)
    .optional()
    .describe(
      `Panels to create, edit, or move between sections, by id. Panels you leave out stay unchanged.
On a new dashboard, cover what the data supports: summary metrics (metric or gauge), trends over time (xy line or area), and breakdowns or distributions (xy bar, data_table, pie, treemap, heatmap, tag_cloud). Add as many panels as the data and the request justify, each with a clear purpose. For a vague request, cover the breadth of the mapped fields rather than a minimal set. A markdown panel can add context.
Pick the first panel kind that fits:
- Lens (source "request", renderer omitted): metrics, time series, bar, area, pie, and tables. chartType is required for a new Lens panel.
- Vega (source "request", renderer "vega"): scatter or bubble plots, small multiples, layered or combination charts, or when asked for Vega.
- markdown (source "config"): static text or links with no data.
- custom content (source "request", renderer "custom_content"): a last resort for HTML layouts that Lens and Vega cannot express, such as status boards or KPI cards with badges, or when asked for custom HTML. It shows live data only from its own esql.
ML anomaly panels are also authored by value with source "config". Source "attachment" places a visualization already created in the same Agent Builder conversation, by its id; other callers cannot use it.`
    ),
  controls: z
    .array(controlInputSchema)
    .max(20)
    .optional()
    .describe(
      'Controls to add or replace, by id. Controls you leave out stay unchanged. Controls are filters pinned above the panels that let viewers narrow the data without editing queries. On a new dashboard, add 3-5 options_list_control dropdowns on low-cardinality keyword fields the panels group or filter by (e.g. service.name, host.name, region), not identifiers such as trace or request ids. Skip controls when the dashboard covers a single entity, such as one host. Controls query the index directly, so columns created in ES|QL (DISSECT, GROK, EVAL, RENAME) cannot back one; add fewer or none when no mapped field fits. Use range_slider_control sparingly, for a numeric field worth filtering across panels. Use time_slider_control for time sub-range filtering, at most one per dashboard.'
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
