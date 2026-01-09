/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { dashboardAttachments, dashboardTools, type DashboardAttachmentData } from '../../common';

/**
 * Schema for panel summary information
 */
const panelSummarySchema = z.object({
  type: z.string(),
  title: z.string().optional(),
});

/**
 * Schema for dashboard attachment data.
 * This should match the DashboardAttachmentData interface in common/types.ts
 */
export const dashboardAttachmentDataSchema = z.object({
  dashboardId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  panelCount: z.number(),
  panels: z.array(panelSummarySchema).optional(),
});

/**
 * Type guard to narrow attachment data to DashboardAttachmentData
 */
const isDashboardAttachmentData = (data: unknown): data is DashboardAttachmentData => {
  return dashboardAttachmentDataSchema.safeParse(data).success;
};

/**
 * Creates the definition for the `dashboard` attachment type.
 */
export const createDashboardAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: dashboardAttachments.dashboard,
    validate: (input) => {
      const parseResult = dashboardAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      const data = attachment.data;
      if (!isDashboardAttachmentData(data)) {
        throw new Error(`Invalid dashboard attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatDashboardData(data) };
        },
      };
    },
    getTools: () => [dashboardTools.createDashboard, dashboardTools.updateDashboard],
    getAgentDescription: () => {
      return `You have access to the user's current dashboard context. The user is viewing a dashboard in Kibana and may ask questions about it, request modifications, or want to analyze the data displayed.

DASHBOARD CONTEXT:
{dashboardData}

---
When the user asks about the dashboard:
1. Use the dashboard title and description to understand the context
2. Review the panels to understand what visualizations are present
3. If the user wants to modify the dashboard, use the ${dashboardTools.updateDashboard} tool
4. If the user wants to create a new dashboard based on this one, use the ${dashboardTools.createDashboard} tool

You can help the user:
- Understand what the dashboard shows
- Add, remove, or modify panels
- Update the dashboard title or description
- Create visualizations based on the existing data patterns`;
    },
  };
};

/**
 * Formats dashboard data for display to the LLM.
 *
 * @param data - The dashboard attachment data
 * @returns Formatted string representation of the dashboard data
 */
const formatDashboardData = (data: DashboardAttachmentData): string => {
  const lines: string[] = [`Dashboard ID: ${data.dashboardId}`, `Title: ${data.title}`];

  if (data.description) {
    lines.push(`Description: ${data.description}`);
  }

  lines.push(`Number of panels: ${data.panelCount}`);

  if (data.panels && data.panels.length > 0) {
    lines.push('');
    lines.push('Panels:');
    data.panels.forEach((panel, index) => {
      const panelTitle = panel.title || '(untitled)';
      lines.push(`  ${index + 1}. ${panelTitle} (${panel.type})`);
    });
  }

  return lines.join('\n');
};
