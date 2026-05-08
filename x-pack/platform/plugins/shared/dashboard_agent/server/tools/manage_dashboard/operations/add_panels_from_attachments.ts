/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/dashboard-agent-common';
import { z } from '@kbn/zod/v4';
import { appendPanelsToDashboard } from '../dashboard_state';
import { defineOperation } from './types';

const attachmentWithGridSchema = z.object({
  attachmentId: z.string().describe('Visualization attachment ID to add as a dashboard panel.'),
  grid: panelGridSchema.describe(
    'Panel layout in grid units. w: width (1–48), h: height, x: column (0–47), y: row. The dashboard is 48 columns wide. Always set x and y to place panels without gaps.'
  ),
});

export const addPanelsFromAttachmentsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_panels_from_attachments'),
    items: z
      .array(
        attachmentWithGridSchema.extend({
          sectionId: z
            .string()
            .optional()
            .describe(
              'ID of an existing section to add this panel into. The section must already exist (use add_section first). If omitted, panel is added at the top level.'
            ),
        })
      )
      .min(1)
      .describe('Visualization attachments to add, each with its dashboard grid layout.'),
  }),
  handler: ({ dashboardData, operation, context }) => {
    let nextDashboardData = dashboardData;

    for (const item of operation.items) {
      const result = context.resolvePanelsFromAttachments([
        {
          attachmentId: item.attachmentId,
          grid: item.grid,
        },
      ]);

      if (result.panels.length > 0) {
        nextDashboardData = appendPanelsToDashboard({
          dashboardData: nextDashboardData,
          panelsToAdd: result.panels,
          sectionId: item.sectionId,
        });
      }

      context.failures.push(...result.failures);
    }

    return nextDashboardData;
  },
});
