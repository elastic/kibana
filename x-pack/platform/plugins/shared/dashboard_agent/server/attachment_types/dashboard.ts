/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResolverTypeDefinition,
  ResolverResolveContext,
  ResolverStaleCheckItem,
} from '@kbn/agent-context-layer-plugin/server';
import deepEqual from 'fast-deep-equal';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  attachmentDataToDashboardState,
  dashboardAttachmentDataSchema,
  dashboardStateToAttachmentData,
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

const normalizeDashboardAttachmentData = (
  data: DashboardAttachmentData
): DashboardAttachmentData => {
  return dashboardStateToAttachmentData(attachmentDataToDashboardState(data));
};

/**
 * Creates the definition for the `dashboard` attachment type.
 */
export const createDashboardAttachmentType = ({
  logger,
  getDashboardClient,
}: CreateDashboardAttachmentTypeOptions): ResolverTypeDefinition<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  DashboardAttachmentData
> => {
  const fetchDashboard = async (
    origin: string,
    context: ResolverResolveContext
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
      context: ResolverResolveContext
    ): Promise<DashboardAttachmentData | undefined> => {
      try {
        const dashboard = await fetchDashboard(origin, context);
        if (!dashboard) {
          return undefined;
        }

        return dashboardStateToAttachmentData(dashboard.data);
      } catch (error) {
        logger.warn(`Failed to resolve dashboard attachment for origin "${origin}": ${error}`);
        return undefined;
      }
    },
    isStale: async (
      item: ResolverStaleCheckItem<DashboardAttachmentData>,
      context: ResolverResolveContext
    ): Promise<boolean> => {
      if (!item.origin || !item.origin_snapshot_at) {
        return false;
      }
      try {
        const dashboard = await fetchDashboard(item.origin, context);
        const dashboardUpdatedAt = dashboard?.meta.updated_at;
        if (!dashboard || !dashboardUpdatedAt) {
          return false;
        }

        if (Date.parse(dashboardUpdatedAt) > Date.parse(item.origin_snapshot_at)) {
          const resolvedDashboardData = normalizeDashboardAttachmentData(
            dashboardStateToAttachmentData(dashboard.data)
          );
          // Compare canonicalized attachment data so Lens panel shape differences do not cause false staleness.
          return !deepEqual(resolvedDashboardData, normalizeDashboardAttachmentData(item.data));
        }
        return false;
      } catch (error) {
        logger.warn(
          `Failed to check staleness for dashboard attachment "${item.origin}": ${error}`
        );
        return false;
      }
    },
    format: (item) => {
      return {
        type: 'text',
        value: formatDashboardAttachment(item.id, item.data),
      };
    },
    getAgentDescription: () =>
      `A dashboard attachment represents a composed dashboard with panels and sections. Rendering it inline displays an interactive dashboard card in the conversation UI that the user can click to open the full dashboard. Summarize the dashboard content (title, description, panel list) in plain text alongside the rendered attachment. To modify this attachment, use the \`platform.dashboard.manage_dashboard\` tool (load the dashboard-management skill first).`,
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
