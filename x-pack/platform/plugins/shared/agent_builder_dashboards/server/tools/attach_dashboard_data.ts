/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardAttachmentDataSchema,
  isSection,
} from '@kbn/agent-builder-dashboards-common';

import { dashboardTools } from '../../common';

const attachDashboardDataSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .optional()
    .describe(
      '(optional) Existing dashboard attachment ID to update. If omitted, a new attachment is created.'
    ),
  dashboardData: dashboardAttachmentDataSchema,
});

export const attachDashboardDataTool = (): BuiltinSkillBoundedTool<
  typeof attachDashboardDataSchema
> => {
  return {
    id: dashboardTools.attachDashboardData,
    type: ToolType.builtin,
    description: `Create or update a dashboard attachment from raw dashboard data.

Use this after the manage_dashboard API returns a dashboardData object, to render the dashboard inline in the UI. Provide dashboardAttachmentId to update an existing attachment, or omit it to create a new one.`,
    schema: attachDashboardDataSchema,
    handler: async ({ dashboardAttachmentId, dashboardData }, { logger, attachments }) => {
      try {
        const isNewAttachment = !dashboardAttachmentId;
        const attachmentId = dashboardAttachmentId ?? uuidv4();
        const description = `Dashboard: ${dashboardData.title}`;

        const attachment = isNewAttachment
          ? await attachments.add({
              id: attachmentId,
              type: DASHBOARD_ATTACHMENT_TYPE,
              description,
              data: dashboardData,
            })
          : await attachments.update(attachmentId, { data: dashboardData, description });

        if (!attachment) {
          throw new Error(`Failed to persist dashboard attachment "${attachmentId}".`);
        }

        logger.info(
          `Dashboard attachment ${isNewAttachment ? 'created' : 'updated'} "${attachment.id}"`
        );

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                version: attachment.current_version ?? 1,
                dashboardAttachment: {
                  id: attachment.id,
                  content: {
                    title: dashboardData.title,
                    description: dashboardData.description,
                    panels: dashboardData.panels.map((widget) => {
                      if (isSection(widget)) {
                        return {
                          id: widget.id,
                          title: widget.title,
                          collapsed: widget.collapsed,
                          grid: widget.grid,
                          panels: widget.panels.map((panel) => ({
                            type: panel.type,
                            id: panel.id,
                            grid: panel.grid,
                          })),
                        };
                      }
                      return {
                        type: widget.type,
                        id: widget.id,
                        grid: widget.grid,
                      };
                    }),
                  },
                },
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in attach_dashboard_data tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to attach dashboard data: ${errorMessage}`,
                metadata: {
                  dashboardAttachmentId,
                },
              },
            },
          ],
        };
      }
    },
  };
};
