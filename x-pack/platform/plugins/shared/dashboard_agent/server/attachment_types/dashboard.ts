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
import type { Logger } from '@kbn/core/server';
import { createRequestHandlerContext } from '../create_request_handler_context';

interface CreateDashboardAttachmentTypeOptions {
  logger: Logger;
  getDashboardClient: () => Promise<DashboardPluginStart['client']>;
}

/**
 * Creates the definition for the `dashboard` attachment type.
 */
export const createDashboardAttachmentType = ({
  logger,
  getDashboardClient,
}: CreateDashboardAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  DashboardAttachmentData
> => {
  const fetchDashboard = async (
    origin: string,
    context: AttachmentResolveContext
  ): Promise<Awaited<ReturnType<DashboardPluginStart['client']['read']>> | undefined> => {
    if (!context.savedObjectsClient) {
      throw new Error('Saved objects client is required to read dashboard attachments');
    }
    // todo: this should be passed from agent builder
    const requestHandlerContext = createRequestHandlerContext(context.savedObjectsClient);
    const dashboardClient = await getDashboardClient();
    return dashboardClient.read(requestHandlerContext, origin);
  };

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
      try {
        const dashboard = await fetchDashboard(origin, context);
        if (!dashboard) {
          return undefined;
        }

        return dashboardStateToAttachment(dashboard.data);
      } catch (error) {
        logger.warn(`Failed to resolve dashboard attachment for origin "${origin}": ${error}`);
        return undefined;
      }
    },
    isStale: async (
      attachment: VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData>,
      context: AttachmentResolveContext
    ): Promise<boolean> => {
      if (!attachment.origin || !attachment.origin_snapshot_at) {
        return false;
      }
      try {
        const dashboard = await fetchDashboard(attachment.origin, context);
        const dashboardUpdatedAt = dashboard?.meta.updated_at;
        if (!dashboard || !dashboardUpdatedAt) {
          return false;
        }

        if (Date.parse(dashboardUpdatedAt) > Date.parse(attachment.origin_snapshot_at)) {
          const latestVersion = getLatestVersion(attachment);
          if (!latestVersion) {
            logger.warn(
              `Attachment "${attachment.id}" has no version matching current_version ${attachment.current_version}`
            );
            return false;
          }
          // if the content is equal, we don't consider it stale
          return !deepEqual(dashboardStateToAttachment(dashboard.data), latestVersion.data);
        }
        return false;
      } catch (error) {
        logger.warn(
          `Failed to check staleness for dashboard attachment "${attachment.origin}": ${error}`
        );
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
