/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils/config_builder';
import type { ToolAvailabilityContext, ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  getLatestVersion,
  type AttachmentVersion,
} from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE, type DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import {
  buildMarkdownPanel as buildMarkdownPanelBase,
  getMarkdownPanelHeight as getMarkdownPanelHeightBase,
  getPanelDimensions as getPanelDimensionsBase,
  panelLayout,
} from '../../common';

/**
 * Shared availability handler for all dashboard tools.
 * Checks if dashboard tools are enabled via UI settings.
 */
export const checkDashboardToolsAvailability = async ({
  uiSettings,
}: ToolAvailabilityContext): Promise<ToolAvailabilityResult> => {
  const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID);
  return { status: enabled ? 'available' : 'unavailable' };
};

export const getPanelDimensions = (chartType: string): { width: number; height: number } =>
  getPanelDimensionsBase(chartType);

/**
 * Builds a markdown panel for dashboard summaries with dynamic height based on content.
 */
export const buildMarkdownPanel = (content: string): DashboardPanel => ({
  ...buildMarkdownPanelBase(content, panelLayout),
});

/**
 * Returns the height of a markdown panel for use in offset calculations.
 */
export const getMarkdownPanelHeight = (content: string): number =>
  getMarkdownPanelHeightBase(content, panelLayout);

/**
 * Retrieves and validates the latest version of an attachment by ID and expected type.
 */
export const retrieveLatestVersion =(
  attachments: Pick<AttachmentStateManager, 'getAttachmentRecord'>,
  attachmentId: string | undefined,
): AttachmentVersion<DashboardAttachmentData> | undefined => {
  if (!attachmentId) {
    return undefined;
  }
  if (!attachmentId) {
    throw new Error('Attachment ID is required.');
  }

  const attachment = attachments.getAttachmentRecord(attachmentId);
  if (!attachment) {
    throw new Error(`Dashboard attachment "${attachmentId}" not found.`);
  }

  if (attachment.type !== DASHBOARD_ATTACHMENT_TYPE) {
    throw new Error(`Attachment "${attachmentId}" is not a ${DASHBOARD_ATTACHMENT_TYPE} attachment.`);
  }

  const latestVersion = getLatestVersion(attachment) as unknown as AttachmentVersion<DashboardAttachmentData>;
  if (!latestVersion) {
    throw new Error(
      `Could not retrieve latest version of dashboard attachment "${attachmentId}".`
    );
  }

  return latestVersion;
};

/**
 * Resolves a Lens configuration from a visualization attachment.
 * Always uses the latest version of the attachment.
 * @param attachmentId - The visualization attachment ID
 * @param attachments - The attachment state manager
 */
export const resolveLensConfigFromAttachment = (
  attachmentId: string,
  attachments: AttachmentStateManager
): LensApiSchemaType => {
  const latestVersion = attachments.getLatest(attachmentId);

  if (!latestVersion) {
    throw new Error(
      `Visualization attachment "${attachmentId}" was not found. Make sure you're using an attachment_id from a previous create_visualizations call.`
    );
  }

  const attachment = attachments.get(attachmentId);
  // TODO: Use const -  VISUALIZATION_ATTACHMENT_TYPE
  if (!attachment || attachment.type !== 'visualization') {
    throw new Error(
      `Attachment "${attachmentId}" is not a visualization attachment (got "${attachment?.type}").`
    );
  }

  // TODO: Fix types
  const data = latestVersion.data;
  const visualization = (data as { visualization?: unknown }).visualization;

  if (!visualization || typeof visualization !== 'object') {
    throw new Error(
      `Visualization attachment "${attachmentId}" does not contain a valid visualization config.`
    );
  }

  return visualization as LensApiSchemaType;
};


/**
 * Filters out visualization IDs from an array.
 * Used by manage_dashboard to remove visualizations before rebuilding the dashboard.
 */
export const filterVisualizationIds = (
  visualizationIds: string[],
  idsToRemove: string[]
): string[] => {
  const removeSet = new Set(idsToRemove);
  return visualizationIds.filter((id) => !removeSet.has(id));
};
