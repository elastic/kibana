/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentTypeDefinition,
  AttachmentResolveContext,
} from '@kbn/agent-builder-server/attachments';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import deepEqual from 'fast-deep-equal';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardAttachmentDataSchema,
  dashboardStateToAttachment,
  isSection,
  type DashboardAttachmentData,
} from '@kbn/dashboard-agent-common';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';

interface CreateDashboardAttachmentTypeOptions {
  getDashboardClient: () => Promise<DashboardPluginStart['client']>;
}

/**
 * Creates the definition for the `dashboard` attachment type.
 */
export const createDashboardAttachmentType = ({
  getDashboardClient,
}: CreateDashboardAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  DashboardAttachmentData
> => {
  return {
    id: DASHBOARD_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = dashboardAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    resolve: async (
      origin: string,
      context: AttachmentResolveContext
    ): Promise<DashboardAttachmentData | undefined> => {
      if (!context.requestHandlerContext) {
        return undefined;
      }

      try {
        const dashboardClient = await getDashboardClient();
        const dashboard = await dashboardClient.read(context.requestHandlerContext, origin);

        if (dashboard.meta.error) {
          return undefined;
        }
        return dashboardStateToAttachment(dashboard.data);
      } catch {
        return undefined;
      }
    },
    isStale: async (
      attachment: VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData>,
      context: AttachmentResolveContext
    ): Promise<boolean> => {
      if (!attachment.origin || !context.requestHandlerContext) {
        return false;
      }
      try {
        const dashboardClient = await getDashboardClient();
        const dashboard = await dashboardClient.read(
          context.requestHandlerContext,
          attachment.origin
        );
        const storeUpdatedAt = dashboard.meta.updated_at;

        if (!storeUpdatedAt || !attachment.origin_snapshot_at) {
          return false;
        }

        if (new Date(storeUpdatedAt) > new Date(attachment.origin_snapshot_at)) {
          const currentDashboardAttachmentData = normalizeDashboardAttachmentData(
            dashboardStateToAttachment(dashboard.data)
          );
          const latestVersion = getLatestVersion(attachment);
          if (!latestVersion) {
            return true; // this should never happen
          }
          const attachedDashboardData = normalizeDashboardAttachmentData(latestVersion.data);
          console.log('external dashboard data', currentDashboardAttachmentData);
          console.log('latest version data', attachedDashboardData);
          console.log(
            'deepEqual',
            deepEqual(currentDashboardAttachmentData, attachedDashboardData)
          );

          return !deepEqual(currentDashboardAttachmentData, attachedDashboardData);
        }
        return false;
      } catch {
        return false;
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return {
            type: 'text',
            value: formatDashboardAttachment(attachment.id, attachment.data),
          };
        },
      };
    },
    getAgentDescription: () =>
      `A dashboard attachment represents a composed dashboard with panels and sections. Rendering it inline displays an interactive dashboard card in the conversation UI that the user can click to open the full dashboard. Summarize the dashboard content (title, description, panel list) in plain text alongside the rendered attachment.`,
    getTools: () => [],
  };
};

const formatDashboardAttachment = (attachmentId: string, data: DashboardAttachmentData): string => {
  // Count panels and sections from the unified panels array
  let panelCount = 0;
  let sectionCount = 0;

  for (const widget of data.panels) {
    if (isSection(widget)) {
      sectionCount++;
      panelCount += widget.panels.length;
    } else {
      panelCount++;
    }
  }

  const sectionInfo =
    sectionCount > 0 ? `, ${sectionCount} section${sectionCount !== 1 ? 's' : ''}` : '';

  // Include attachment id prominently so the LLM can reference it in subsequent calls
  return `Dashboard "${data.title}" (dashboardAttachment.id: "${attachmentId}")
Description: ${data.description}
Panels: ${panelCount}${sectionInfo}`;
};

const normalizeDashboardAttachmentData = (
  data: DashboardAttachmentData
): DashboardAttachmentData => {
  return JSON.stringify(data) as DashboardAttachmentData;
};
