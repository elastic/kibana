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
  type GenericAttachmentPanel,
  type LensAttachmentPanel,
} from '@kbn/dashboard-agent-common';
import type { Logger } from '@kbn/core/server';
import { type AttachmentVersion, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
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

interface UpsertMarkdownPanelResult {
  panels: AttachmentPanel[];
  changedPanel?: AttachmentPanel;
}

const isDashboardMarkdownPanel = (
  panel: AttachmentPanel
): panel is GenericAttachmentPanel & { type: typeof MARKDOWN_EMBEDDABLE_TYPE } => {
  return isGenericAttachmentPanel(panel) && panel.type === MARKDOWN_EMBEDDABLE_TYPE;
};

const getMarkdownContent = (panel: AttachmentPanel): string | undefined => {
  if (!isDashboardMarkdownPanel(panel)) {
    return undefined;
  }

  const { content } = panel.rawConfig;
  return typeof content === 'string' ? content : undefined;
};

export const upsertMarkdownPanel = (
  panels: AttachmentPanel[],
  markdownContent?: string
): UpsertMarkdownPanelResult => {
  if (!markdownContent) {
    return { panels };
  }

  const existingMarkdownPanelIndex = panels.findIndex((panel) => isDashboardMarkdownPanel(panel));
  if (existingMarkdownPanelIndex === -1) {
    const markdownPanel: AttachmentPanel = {
      type: MARKDOWN_EMBEDDABLE_TYPE,
      panelId: uuidv4(),
      rawConfig: { content: markdownContent },
    };
    return {
      panels: [markdownPanel, ...panels],
      changedPanel: markdownPanel,
    };
  }

  const existingMarkdownPanel = panels[existingMarkdownPanelIndex];
  if (!isDashboardMarkdownPanel(existingMarkdownPanel)) {
    return { panels };
  }

  if (getMarkdownContent(existingMarkdownPanel) === markdownContent) {
    return { panels };
  }

  const updatedMarkdownPanel: AttachmentPanel = {
    ...existingMarkdownPanel,
    rawConfig: {
      ...existingMarkdownPanel.rawConfig,
      content: markdownContent,
    },
  };
  const updatedPanels = [...panels];
  updatedPanels[existingMarkdownPanelIndex] = updatedMarkdownPanel;

  return {
    panels: updatedPanels,
    changedPanel: updatedMarkdownPanel,
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
  const panelsToRemove: AttachmentPanel[] = [];
  const panelsToKeep: AttachmentPanel[] = [];

  for (const panel of panels) {
    if (removeSet.has(panel.panelId)) {
      panelsToRemove.push(panel);
    } else {
      panelsToKeep.push(panel);
    }
  }

  return {
    panelsToRemove,
    panelsToKeep,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const extractLensVisualization = (data: unknown): LensApiSchemaType | undefined => {
  if (!isRecord(data)) {
    return undefined;
  }

  const { visualization } = data;
  if (!isRecord(visualization)) {
    return undefined;
  }

  return visualization as LensApiSchemaType;
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

  const visualization = extractLensVisualization(latestVersion.data);
  if (!visualization) {
    throw new Error(
      `Visualization attachment "${attachmentId}" does not contain a valid visualization config.`
    );
  }

  return visualization;
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
