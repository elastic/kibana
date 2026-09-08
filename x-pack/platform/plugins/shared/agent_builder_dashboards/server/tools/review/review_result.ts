/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';

/**
 * Output contract of the dashboard reviewer model.
 *
 * The reviewer runs in its own model context with the detailed presentation
 * guidance; the main agent only sees the tool result derived from this. Every
 * correction therefore has to be self-contained: exact titles, formats, palette
 * names, grid values, and section targets. Panels without findings are not
 * listed, only counted as reviewed.
 */

const panelIdSchema = z.string().describe('A panel `id` exactly as it appears in the dashboard.');

const dashboardFindingSchema = z.object({
  affected_ids: z
    .array(z.string())
    .describe('Panel or section ids the finding applies to; empty for the whole dashboard.'),
  problem: z.string(),
  correction: z
    .string()
    .describe(
      'The exact change with its concrete values, e.g. the new dashboard title, the section to add with its title and row, or the panels to move.'
    ),
});

const newSectionSchema = z.object({
  key: z
    .string()
    .describe('Short unique key (e.g. "overview"); layout entries reference it as their section.'),
  title: z.string(),
  y: z.number().int().min(0).describe('Outer dashboard grid row of the section.'),
});

const layoutChangeSchema = z.object({
  panel_id: panelIdSchema,
  section: z
    .string()
    .nullable()
    .describe('Existing section id, key of a new section, or null for the top level.'),
  grid: panelGridSchema.describe('Final grid, relative to the section when inside one.'),
});

const panelFindingSchema = z.object({
  problem: z.string(),
  correction: z
    .string()
    .describe(
      'The edit instruction itself, e.g. "remove the panel title" or "format the value as bytes with 1 decimal".'
    ),
  appearance_only: z
    .boolean()
    .describe('True when the panel query is kept and only presentation changes.'),
});

export const dashboardReviewOutputSchema = z
  .object({
    reviewed_panel_ids: z
      .array(panelIdSchema)
      .describe('Every panel you assessed, including panels without findings.'),
    could_not_assess: z
      .array(z.object({ panel_id: panelIdSchema, reason: z.string() }))
      .describe('Panels whose presentation could not be judged, with the reason.'),
    dashboard_findings: z
      .array(dashboardFindingSchema)
      .describe('Composition, section membership, layout, and metadata problems.'),
    new_sections: z
      .array(newSectionSchema)
      .describe('Sections to create; empty when none are needed.'),
    layout_changes: z
      .array(layoutChangeSchema)
      .describe(
        'Final placement for every panel that moves or resizes. Unlisted panels keep their grid.'
      ),
    panel_findings: z
      .array(z.object({ panel_id: panelIdSchema, findings: z.array(panelFindingSchema).min(1) }))
      .describe('Only panels with findings.'),
    data_questions: z
      .array(z.object({ affected_ids: z.array(z.string()), question: z.string() }))
      .describe(
        'Needs data investigation (duplicates, missing coverage, unclear units); not presentation fixes.'
      ),
  })
  .describe('Report the dashboard review.');

export type DashboardReviewOutput = z.infer<typeof dashboardReviewOutputSchema>;

/** Review validated against the dashboard's real panels and sections, as returned by the tool. */
export interface DashboardReview extends Omit<DashboardReviewOutput, 'reviewed_panel_ids'> {
  no_issues_panel_ids: string[];
}

/** Result data returned by the review tool to the main agent. */
export interface DashboardReviewResultData extends DashboardReview {
  attachment_id: string;
  version: number;
  /** Whether appearance was assessed from a screenshot or from the configuration alone. */
  visual_assessment: 'screenshot' | 'configuration_only';
  screenshot_note?: string;
  /** Panels the reviewer neither assessed nor marked as not assessable. */
  unreviewed_panel_ids: string[];
}
