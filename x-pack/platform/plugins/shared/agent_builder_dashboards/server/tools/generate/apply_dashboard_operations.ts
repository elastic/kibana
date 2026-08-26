/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import {
  createVisPanelResolver,
  executeDashboardOperations,
  type DashboardOperation,
} from './core';
import { applyDefaultDashboardTimeRange } from './time_range';

/**
 * Shared Kibana host for generate and Prettify: run dashboard operations, apply
 * the default time range, and persist the result as a dashboard attachment.
 */
export const applyDashboardOperations = async ({
  attachments,
  dashboardAttachmentId,
  existingDashboard,
  operations,
  createNew,
  logger,
  events,
  esClient,
  modelProvider,
  customContentEnabled,
}: {
  attachments: AttachmentStateManager;
  dashboardAttachmentId: string;
  existingDashboard?: DashboardAttachmentData;
  operations: DashboardOperation[];
  createNew: boolean;
  logger: Logger;
  events: ToolEventEmitter;
  esClient: IScopedClusterClient;
  modelProvider: ModelProvider;
  customContentEnabled: boolean;
}) => {
  const { dashboardData, failures, panelAuthoringNotes } = await executeDashboardOperations({
    dashboardData: existingDashboard,
    operations,
    logger,
    resolvePanelContent: createVisPanelResolver({
      logger,
      modelProvider,
      events,
      esClient,
    }),
    resolveCustomContentTemplate: customContentEnabled
      ? createCustomContentTemplateResolver({ logger, modelProvider, esClient })
      : undefined,
  });

  const finalDashboardData = await applyDefaultDashboardTimeRange({
    dashboardData,
    esClient,
    logger,
  });

  const description = `Dashboard: ${finalDashboardData.title}`;
  const attachment = createNew
    ? await attachments.add({
        id: dashboardAttachmentId,
        type: DASHBOARD_ATTACHMENT_TYPE,
        description,
        data: finalDashboardData,
      })
    : await attachments.update(dashboardAttachmentId, {
        data: finalDashboardData,
        description,
      });

  if (!attachment) {
    throw new Error(`Failed to persist dashboard attachment "${dashboardAttachmentId}".`);
  }

  return {
    attachment,
    dashboardData: finalDashboardData,
    failures,
    panelAuthoringNotes,
  };
};
