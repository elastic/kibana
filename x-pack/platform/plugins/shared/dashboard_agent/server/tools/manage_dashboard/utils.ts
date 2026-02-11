/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AttachmentPanel, DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  isGenericAttachmentPanel,
  type LensAttachmentPanel,
} from '@kbn/dashboard-agent-common';
import type { Logger } from '@kbn/core/server';
import { type AttachmentVersion, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils';

/**
 * Failure record for tracking visualization errors.
 */
export interface VisualizationFailure {
  type: string;
  identifier: string;
  error: string;
}

/**
 * Type-safe extraction of error message from unknown error.
 */
export const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
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

/**
 * Resolves existing visualization attachments and adds them as dashboard panels.
 * - simply looks up pre-built configurations.
 */
export const resolveExistingVisualizations = async ({
  visualizationIds,
  attachments,
  logger,
}: {
  visualizationIds?: string[];
  attachments: AttachmentStateManager;
  logger: Logger;
}): Promise<{ panels: LensAttachmentPanel[]; failures: VisualizationFailure[] }> => {
  if (!visualizationIds || visualizationIds.length === 0) {
    return { panels: [], failures: [] };
  }

  const panels: LensAttachmentPanel[] = [];
  const failures: VisualizationFailure[] = [];

  for (const attachmentId of visualizationIds) {
    try {
      const vizConfig = resolveLensConfigFromAttachment(attachmentId, attachments);

      const panelEntry: LensAttachmentPanel = {
        type: 'lens',
        panelId: uuidv4(),
        visualization: vizConfig,
        title: vizConfig.title,
      };
      panels.push(panelEntry);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Error resolving visualization attachment "${attachmentId}": ${errorMessage}`);
      failures.push({
        type: 'existing_visualization',
        identifier: attachmentId,
        error: errorMessage,
      });
    }
  }

  logger.debug(
    `Successfully resolved ${panels.length}/${visualizationIds.length} existing visualizations`
  );

  return { panels, failures };
};

export const getMarkdownPanel = (
  panels: AttachmentPanel[],
  markdownContent?: string
): AttachmentPanel | undefined => {
  if (!markdownContent) {
    return undefined;
  }

  const hasMarkdownPanel = panels.some(
    (panel) => isGenericAttachmentPanel(panel) && panel.type === 'DASHBOARD_MARKDOWN'
  );

  if (hasMarkdownPanel) {
    return undefined;
  }

  return {
    type: 'DASHBOARD_MARKDOWN',
    panelId: uuidv4(),
    rawConfig: { content: markdownContent },
  };
};

export const getRemovedPanels = (
  panels: AttachmentPanel[],
  removePanelIds?: string[]
): { panelsToRemove: AttachmentPanel[]; panelsToKeep: AttachmentPanel[] } => {
  if (!removePanelIds || removePanelIds.length === 0) {
    return {
      panelsToRemove: [],
      panelsToKeep: panels,
    };
  }

  const removeSet = new Set(removePanelIds);
  return {
    panelsToRemove: panels.filter((panel) => removeSet.has(panel.panelId)),
    panelsToKeep: panels.filter((panel) => !removeSet.has(panel.panelId)),
  };
};

/**
 * Resolves a Lens configuration from a visualization attachment.
 * Always uses the latest version of the attachment.
 * @param attachmentId - The visualization attachment ID
 * @param attachments - The attachment state manager
 */
const resolveLensConfigFromAttachment = (
  attachmentId: string,
  attachments: AttachmentStateManager
): LensApiSchemaType => {
  const attachmentRecord = attachments.getAttachmentRecord(attachmentId);

  if (!attachmentRecord) {
    throw new Error(`Attachment "${attachmentId}" not found.`);
  }
  const latestVersion = getLatestVersion(attachmentRecord);

  if (!latestVersion) {
    throw new Error(
      `Visualization attachment "${attachmentId}" was not found. Make sure you're using an attachment_id from a previous create_visualizations call.`
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
 * Retrieves and validates the latest version of an attachment by ID and expected type.
 */
export const retrieveLatestVersion = (
  attachments: AttachmentStateManager,
  attachmentId: string | undefined
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
    throw new Error(
      `Attachment "${attachmentId}" is not a ${DASHBOARD_ATTACHMENT_TYPE} attachment.`
    );
  }

  const latestVersion = getLatestVersion(
    attachment
  ) as unknown as AttachmentVersion<DashboardAttachmentData>;
  if (!latestVersion) {
    throw new Error(`Could not retrieve latest version of dashboard attachment "${attachmentId}".`);
  }

  return latestVersion;
};
