/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const panelIdSchema = z.string().describe('A panel `id` exactly as it appears in the input.');

/** Panel presentation findings and coverage returned by the reviewer model. */
export const dashboardReviewOutputSchema = z.object({
  panel_findings: z
    .array(
      z.object({
        panel_id: panelIdSchema,
        findings: z
          .array(
            z
              .string()
              .describe(
                'One concise correction to apply a listed chart default, without a separate problem description.'
              )
          )
          .min(1),
      })
    )
    .describe('Only panels with presentation issues, with all findings grouped per panel.'),
  reviewed_panel_ids: z
    .array(panelIdSchema)
    .describe('Panels assessed for presentation, including panels with findings.'),
  could_not_assess: z
    .array(z.object({ panel_id: panelIdSchema, reason: z.string() }))
    .describe('Panels whose presentation could not be fully assessed, with the reason.'),
});

export type DashboardReviewOutput = z.infer<typeof dashboardReviewOutputSchema>;

/** Validated findings with omitted panels identified by the server. */
export interface DashboardReview extends DashboardReviewOutput {
  unreviewed_panel_ids: string[];
}

/** Result data returned by the review tool to the main agent. */
export interface DashboardReviewResultData extends DashboardReview {
  attachment_id: string;
  version: number;
  visual_assessment: 'screenshot' | 'configuration_only';
  screenshot_note?: string;
}
