/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import { asCodeQuerySchema } from '@kbn/as-code-shared-schemas';
import { getControlsGroupSchema } from '@kbn/controls-schemas';
import type { Filter, TimeRange } from '@kbn/es-query';
import { timeRangeSchema } from '@kbn/es-query-server';
import { z, lazySchema } from '@kbn/zod';

/** The most panels, sections and pinned panels a dashboard holds, as the Dashboard API allows. */
const MAX_PANELS = 500;

const panelGridSchema = lazySchema(() =>
  z.object({
    x: z.number(),
    y: z.number(),
    w: z.number().min(1),
    h: z.number().min(1),
  })
);

const panelSchema = lazySchema(() =>
  z
    .object({
      id: z.string().optional(),
      type: z.string().min(1),
      grid: panelGridSchema,
      config: z.record(z.string(), z.unknown()),
    })
    .strict()
);

const sectionSchema = lazySchema(() =>
  z
    .object({
      id: z.string().optional(),
      title: z.string(),
      collapsed: z.boolean().default(false),
      grid: z.object({ y: z.number() }).strict(),
      panels: z.array(panelSchema).max(MAX_PANELS).default([]),
    })
    .strict()
);

/**
 * The parts of the Dashboard API's `DashboardState` materialization reads. Panel configs stay
 * opaque here: each panel's own materializer checks its config against its type's schema.
 */
const dashboardStateSchema = lazySchema(() =>
  z
    .object({
      title: z.string(),
      description: z.string().optional(),
      panels: z
        .array(z.union([sectionSchema, panelSchema]))
        .max(MAX_PANELS)
        .default([]),
      pinned_panels: getControlsGroupSchema(),
      filters: z.array(asCodeFilterSchema).max(MAX_PANELS).optional(),
      query: asCodeQuerySchema.optional(),
      time_range: timeRangeSchema.optional(),
      options: z.object({ hide_panel_titles: z.boolean().optional() }).loose().optional(),
    })
    .loose()
);

export type DashboardStateConfig = z.output<typeof dashboardStateSchema>;
export type DashboardPanelConfig = z.output<typeof panelSchema>;
export type DashboardSectionConfig = z.output<typeof sectionSchema>;
export type DashboardPinnedPanelConfig = DashboardStateConfig['pinned_panels'][number];

/** A panel the Dashboard API leaves out of `DashboardState`, recovered from the stored dashboard. */
export interface DroppedPanel {
  id: string;
  type: string;
  grid: DashboardPanelConfig['grid'];
  sectionId?: string;
  title?: string;
  hideTitle?: boolean;
  /** The saved object a by-reference panel shows. */
  savedObject?: { type: string; id: string };
}

/** A control's filter, and the section it applies to when it isn't global. */
export interface ControlFilter {
  filter: Filter;
  sectionId?: string;
}

/** A control with a selection that couldn't become a filter, and the section it applies to. */
export interface UnappliedControl {
  title: string;
  sectionId?: string;
}

/** What the user's services add to a dashboard before planning. */
export interface ResolvedDashboard {
  /** Data control selections as Kibana filters, in control order. */
  controlFilters: ControlFilter[];
  unappliedControls: UnappliedControl[];
  /** `timepicker:timeDefaults`, for a dashboard and request without a time range. */
  timeDefaults?: TimeRange;
  /** The user's `dateFormat:tz`, which the dashboard's relative time range resolves in. */
  timeZone?: string;
  /** Where the dashboard opens in Kibana, for placeholders to link to. */
  href?: string;
}

/** A dashboard to materialize: its as-code state, and what loading and resolving it added. */
export interface DashboardConfig {
  state: DashboardStateConfig;
  /** The saved dashboard's ID, when it was loaded by reference. */
  id?: string;
  droppedPanels: DroppedPanel[];
  /** Titles of by-reference panels without their own title, from their saved objects, by panel ID. */
  savedTitles: Record<string, string>;
  resolved?: ResolvedDashboard;
}

const loadedConfigs = new WeakSet<object>();

/** Marks a config `load` built, so `parse` takes it as is. */
export const markLoaded = (config: DashboardConfig): DashboardConfig => {
  loadedConfigs.add(config);
  return config;
};

const isLoaded = (config: unknown): config is DashboardConfig =>
  typeof config === 'object' && config !== null && loadedConfigs.has(config);

/** Parses a by-value `DashboardState`, or takes a config `load` built. */
export const parseDashboardConfig = (config: unknown): DashboardConfig =>
  isLoaded(config)
    ? config
    : { state: dashboardStateSchema.parse(config), droppedPanels: [], savedTitles: {} };

export const isDashboardSection = (
  panel: DashboardStateConfig['panels'][number]
): panel is DashboardSectionConfig => 'panels' in panel;
