/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { timeRangeSchema } from '@kbn/agent-builder-dashboards-common';
import { controlInputSchema } from '../controls';
import { upsertPanelContentSchema } from '../panels';

const idSchema = z.string().min(1).max(256);

const upsertSectionSchema = lazySchema(() =>
  z.object({
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
      .describe(
        "Whether the section is collapsed. New sections default to false; omit it to keep an existing section's state."
      ),
  })
);

const upsertPanelSchema = lazySchema(() =>
  z.object({
    id: idSchema.describe(
      'Panel id. An existing id updates that panel; a new id creates one, so copy existing ids exactly. Use a short readable slug for new panels, e.g. "error-rate-trend", that no section or control uses; a new id that looks like a uuid is rejected as a miscopy. List each panel once: to move and edit a panel, set `section` and `content` in the same item. An id is a handle, not a description: read titles for what a panel shows.'
    ),
    section: idSchema
      .nullable()
      .optional()
      .describe(
        'Section id to place the panel in, existing or created in `sections` in this call, or null for the top level. Omit it to keep an existing panel where it is; a new panel goes to the top level.'
      ),
    content: upsertPanelContentSchema
      .optional()
      .describe(
        'Panel content. Required for a new panel; omit it to only move an existing one. On an existing panel it is an edit of the same kind: the same type for source "config", whose config is replaced in full, and the same renderer for source "request" (omit renderer to keep a Lens or Vega panel\'s own; Lens panels have type "vis"). Prefer an edit to removing and re-adding the panel. For a request edit, put only the requested change in query (e.g. "make the error series blue"); unrelated settings are kept. To change the kind, remove the panel and add a new one with a new id. Source "attachment" only adds new panels. Non-ES|QL Lens panels, and panels of types this tool does not create, cannot be edited. Do not edit by-reference panels (config.savedObjectId or config.ref_id) either: their content is unknown, and their title is the only hint. These panels can only be moved, removed, or replaced with a new panel once the user agrees.'
      ),
  })
);

/**
 * The desired changes to a dashboard, keyed by id: dashboard fields, and sections, panels and
 * controls to create or update, and ids to remove.
 */
export const upsertDashboardSchema = lazySchema(() =>
  z.object({
    title: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'Dashboard title. Required for a new dashboard; omit it to keep the current one. Replace an empty or placeholder title with one that says what the dashboard shows.'
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
        'Dashboard time range. Set it ONLY when the user asks for a specific time window, e.g. "last 7 days" → { from: "now-7d", to: "now" }. Otherwise omit it: a dashboard without a range gets a default chosen from its data, and an existing range is kept.'
      ),
    sections: z
      .array(upsertSectionSchema)
      .max(50)
      .optional()
      .describe(
        'Sections to create or update: collapsible groups of panels. Put panels in them with `panels[].section`. On a new dashboard, use sections for roughly 6 or more visualization panels and keep smaller dashboards flat; do not regroup an existing dashboard unless asked to reorganize or improve it. Group panels by purpose, ordering sections as summary metrics, then trends, then breakdowns, or one section per domain with that order inside it. A section holds only panels of its purpose.'
      ),
    panels: z
      .array(upsertPanelSchema)
      .max(100)
      .optional()
      .describe(
        `Panels to create, edit, or move between sections, by id. List only those: panels you leave out stay unchanged, and content sent for an existing panel is applied as an edit.
On a new dashboard, cover what the data supports: summary metrics (metric or gauge), trends over time (xy line or area), and breakdowns or distributions (xy bar, data_table, pie, treemap, heatmap, tag_cloud). Add as many panels as the data and the request justify, each with a clear purpose. For a vague request, cover the breadth of the mapped fields rather than a minimal set. A markdown panel can add context.
Pick the first panel kind that fits:
- Lens (source "request", renderer omitted): metrics and single-number KPIs, time series, bar, area, pie, and tables. chartType is required for a new Lens panel.
- Vega (source "request", renderer "vega"): scatter or bubble plots, small multiples, layered or combination charts, or when asked for Vega.
- markdown (source "config", type "markdown"): static text or links with no data.
- custom content (source "request", renderer "custom_content"): a last resort for HTML layouts that Lens and Vega cannot express, such as status boards or cards that mix values, badges and text, or when asked for custom HTML.
ML anomaly panels (source "config") need existing anomaly detection job ids. Source "attachment" adds a visualization already created in the same Agent Builder conversation as a new panel; it works only there.`
      ),
    controls: z
      .array(controlInputSchema)
      .max(20)
      .optional()
      .describe(
        'Controls to add or replace, by id; controls you leave out stay unchanged. Controls are filters pinned above the panels. On a new dashboard, add 3-5 options_list_control dropdowns on low-cardinality fields the panels group or filter by (e.g. service.name, host.name, region), not identifiers such as trace or request ids. Skip controls when the dashboard covers a single entity, such as one host. Controls query the index directly, so columns created in ES|QL (DISSECT, GROK, EVAL, RENAME) cannot back one; add fewer or none when no mapped field fits. Use range_slider_control sparingly, for a numeric field worth filtering across panels, and time_slider_control for time sub-range filtering, at most one per dashboard. A control that cannot be added, because its field is not mapped on its index or does not suit it, or because it is a second time slider, is left out: silently, unless `user_requested` is true or it replaces an existing control.'
      ),
    remove: z
      .array(idSchema)
      .max(200)
      .optional()
      .describe(
        'Ids of panels, sections, or controls to remove. Removing a section also removes the panels still in it; to keep some, move them in the same call with `panels[].section` (null for the top level). Do not also list a removed id in `panels`, `sections` or `controls`: neither change would be applied.'
      ),
  })
);

export type DashboardUpsert = z.infer<typeof upsertDashboardSchema>;

export type UpsertPanelItem = NonNullable<DashboardUpsert['panels']>[number];

export type UpsertSectionItem = NonNullable<DashboardUpsert['sections']>[number];

/** Whether an upsert can create a new dashboard, which requires a non-blank title. */
export const hasValidNewDashboardMetadata = ({ title }: DashboardUpsert): boolean =>
  title !== undefined && title.trim().length > 0;
