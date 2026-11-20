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
      'Panel id. An existing panel id updates that panel; a new id creates a panel with this id. Use a short readable slug for new panels, e.g. "error-rate-trend"; a new id that looks like a uuid is rejected as a miscopy. List each panel once; to move and edit a panel, set `section` and `content` in the same item. Ids are handles that never change: read panel titles for what a panel shows.'
    ),
    section: idSchema
      .nullable()
      .optional()
      .describe(
        'Section id to place the panel in, existing or created in `sections` in this call, or null for the top level. Omit to keep an existing panel where it is; new panels go to the top level when omitted.'
      ),
    content: upsertPanelContentSchema
      .optional()
      .describe(
        'Panel content. Required for new panels. For an existing panel, edits it (e.g. content with a `query` describing the change) and must match its kind; to change the kind, remove the panel and add a new one with a new id. Omit to only move the panel.'
      ),
  })
);

const upsertOptionsSchema = lazySchema(() =>
  z.looseObject({
    hide_panel_titles: z.boolean().optional().describe('Hide panel titles. Defaults to false.'),
    hide_panel_borders: z.boolean().optional().describe('Hide panel borders. Defaults to false.'),
    use_margins: z
      .boolean()
      .optional()
      .describe('Separate panels with a margin. Defaults to true.'),
    sync_colors: z
      .boolean()
      .optional()
      .describe('Synchronize colors across panels that share a data source. Defaults to false.'),
    sync_tooltips: z
      .boolean()
      .optional()
      .describe('Synchronize tooltips across panels. Defaults to false.'),
    sync_cursor: z
      .boolean()
      .optional()
      .describe('Synchronize the cursor position across panels. Defaults to true.'),
    auto_apply_filters: z
      .boolean()
      .optional()
      .describe(
        'When false, control filter changes apply only after the user clicks the update button. Defaults to true.'
      ),
  })
);

// Browsers store timer delays as 32-bit signed integers; a longer interval overflows and the
// dashboard refreshes continuously.
const MAX_REFRESH_INTERVAL_MS = 2_147_483_647;

const upsertRefreshIntervalSchema = lazySchema(() =>
  z.object({
    pause: z.boolean().describe('false runs auto-refresh, true pauses it.'),
    value: z
      .number()
      .int()
      .min(1000)
      .max(MAX_REFRESH_INTERVAL_MS)
      .describe(
        'Interval in milliseconds, e.g. 30000 for 30 seconds. Values below the deployment minimum (5 seconds on serverless) run at that minimum.'
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
        'Dashboard title. Required for a new dashboard. If the current title is empty, missing, or a placeholder such as "User Dashboard", invent one from the dashboard\'s contents.'
      ),
    description: z.string().max(2048).optional().describe('Dashboard description. "" clears it.'),
    time_range: timeRangeSchema
      .optional()
      .describe(
        'Set ONLY when the user asks for a time window (e.g. "last 7 days"); otherwise omit it and a data-aware default is applied. The screen context time range is not a request unless the user refers to it. Use Kibana date math or ISO 8601, e.g. { from: "now-7d", to: "now" } or { from: "2024-05-20T00:00:00.000Z", to: "2024-05-24T23:59:59.999Z", mode: "absolute" }.'
      ),
    options: upsertOptionsSchema
      .optional()
      .describe(
        'Display and behavior settings. Set ONLY the keys the user asks to change; the other keys keep their current values.'
      ),
    refresh_interval: upsertRefreshIntervalSchema
      .optional()
      .describe(
        'Auto-refresh. Set ONLY when the user asks, e.g. "refresh every 30 seconds" is { pause: false, value: 30000 }. Saved only together with a time range. Replaces the current setting.'
      ),
    esql_approximation: z
      .boolean()
      .optional()
      .describe(
        'Fast mode: ES|QL panels with STATS run with approximate, faster results. Set ONLY when the user asks. false turns it off.'
      ),
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
        'Panels to create, edit, or move between sections, by id. Panels you leave out stay unchanged.'
      ),
    controls: z
      .array(controlInputSchema)
      .max(20)
      .optional()
      .describe(
        'Controls to add or replace, by id. Controls you leave out stay unchanged. Use options_list_control for categorical/keyword fields, range_slider_control for numeric fields, time_slider_control for time sub-range filtering (at most one per dashboard). A control that cannot be added, because its field is not mapped on its index or does not suit it, or because it is a second time slider, is left out: silently, unless `user_requested` is true or it replaces an existing control.'
      ),
    remove: z
      .array(idSchema)
      .max(200)
      .optional()
      .describe(
        'Ids of panels, sections, or controls to remove. Removing a section also removes the panels still in it; to keep some, move them in the same call with `panels[].section` (null for the top level). Do not also list a removed id in `panels`, `sections` or `controls`: neither change is applied.'
      ),
  })
);

export type DashboardUpsert = z.infer<typeof upsertDashboardSchema>;

export type UpsertPanelItem = NonNullable<DashboardUpsert['panels']>[number];

export type UpsertSectionItem = NonNullable<DashboardUpsert['sections']>[number];

/** Whether an upsert can create a new dashboard, which requires a non-blank title. */
export const hasValidNewDashboardMetadata = ({ title }: DashboardUpsert): boolean =>
  title !== undefined && title.trim().length > 0;
