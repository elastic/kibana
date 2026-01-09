/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  dashboardAttachments,
  dashboardTools,
  type DashboardAttachmentData,
  type DashboardAttachmentPanel,
  type DashboardAttachmentSection,
} from '@kbn/dashboard-agent-common';

/**
 * Schema for full panel configuration
 */
const dashboardAttachmentPanelSchema = z.object({
  type: z.string(),
  uid: z.string().optional(),
  config: z.record(z.unknown()),
});

/**
 * Schema for dashboard sections
 */
const dashboardAttachmentSectionSchema = z.object({
  title: z.string(),
  collapsed: z.boolean(),
  panels: z.array(dashboardAttachmentPanelSchema),
});

/**
 * Schema for dashboard attachment data.
 * This should match the DashboardAttachmentData interface in @kbn/dashboard-agent-common.
 */
export const dashboardAttachmentDataSchema = z.object({
  dashboardId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  panelCount: z.number(),
  panels: z.array(dashboardAttachmentPanelSchema).optional(),
  sections: z.array(dashboardAttachmentSectionSchema).optional(),
  attachmentLabel: z.string().optional(),
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
2. Review the panels and their configurations to understand what visualizations are present
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
 * Formats a single panel for display to the LLM.
 */
const formatPanel = (panel: DashboardAttachmentPanel, index: number): string => {
  const lines: string[] = [];
  const title =
    (panel.config as { title?: string })?.title ||
    (panel.config as { attributes?: { title?: string } })?.attributes?.title ||
    '(untitled)';

  lines.push(`  ${index + 1}. ${title}`);
  lines.push(`     Type: ${panel.type}`);
  if (panel.uid) {
    lines.push(`     UID: ${panel.uid}`);
  }
  lines.push(`     Config: ${JSON.stringify(panel.config, null, 2).split('\n').join('\n     ')}`);

  return lines.join('\n');
};

/**
 * Formats a section for display to the LLM.
 */
const formatSection = (section: DashboardAttachmentSection, sectionIndex: number): string => {
  const lines: string[] = [];
  lines.push(`\nSection ${sectionIndex + 1}: ${section.title}`);

  if (section.panels.length > 0) {
    section.panels.forEach((panel, panelIndex) => {
      lines.push(formatPanel(panel, panelIndex));
    });
  } else {
    lines.push('  (no panels in this section)');
  }

  return lines.join('\n');
};

/**
 * Formats dashboard data for display to the LLM.
 *
 * @param data - The dashboard attachment data
 * @returns Formatted string representation of the dashboard data
 */
const formatDashboardData = (data: DashboardAttachmentData): string => {
  const lines: string[] = [
    `Dashboard ID: ${data.dashboardId ?? '(unsaved)'}`,
    `Title: ${data.title}`,
  ];

  if (data.description) {
    lines.push(`Description: ${data.description}`);
  }

  lines.push(`Total panels: ${data.panelCount}`);

  // Format top-level panels
  if (data.panels && data.panels.length > 0) {
    lines.push('');
    lines.push('Panels:');
    data.panels.forEach((panel, index) => {
      lines.push(formatPanel(panel, index));
    });
  }

  // Format sections
  if (data.sections && data.sections.length > 0) {
    data.sections.forEach((section, index) => {
      lines.push(formatSection(section, index));
    });
  }

  return lines.join('\n');
};
