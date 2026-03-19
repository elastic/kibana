/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
  LensAttachmentPanel,
} from '@kbn/dashboard-agent-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { Logger } from '@kbn/core/server';
import { type AttachmentVersion, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils';
import { z } from '@kbn/zod/v4';

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

const visualizationAttachmentDataSchema = z.object({
  visualization: z.record(z.string(), z.unknown()),
  query: z.string().optional(),
});

type ResolvedPanelWithoutGrid = Omit<LensAttachmentPanel, 'grid'>;

const resolvePanelsFromVisualizationAttachment = (data: unknown): ResolvedPanelWithoutGrid[] => {
  const parseResult = visualizationAttachmentDataSchema.safeParse(data);
  if (!parseResult.success) {
    throw new Error('Visualization attachment does not contain a valid visualization payload.');
  }

  const { visualization, query } = parseResult.data;
  const title =
    typeof visualization.title === 'string'
      ? visualization.title
      : query ?? 'Generated visualization';

  return [
    {
      type: 'lens',
      panelId: uuidv4(),
      visualization: visualization as LensApiSchemaType,
      title,
      ...(query ? { query } : {}),
    },
  ];
};

const resolvePanelsFromAttachment = (type: string, data: unknown): ResolvedPanelWithoutGrid[] => {
  if (type === AttachmentType.visualization) {
    return resolvePanelsFromVisualizationAttachment(data);
  }

  throw new Error(
    `Attachment type "${type}" is not supported in add_panels_from_attachments. Only "${AttachmentType.visualization}" is supported.`
  );
};

/**
 * Resolves attachment ids into dashboard panel entries.
 * Supports visualization attachments and dashboard-compatible panel payloads.
 */
export const resolvePanelsFromAttachments = async ({
  attachmentInputs,
  attachments,
  logger,
}: {
  attachmentInputs?: Array<{ attachmentId: string; grid: AttachmentPanel['grid'] }>;
  attachments: AttachmentStateManager;
  logger: Logger;
}): Promise<{ panels: AttachmentPanel[]; failures: VisualizationFailure[] }> => {
  if (!attachmentInputs || attachmentInputs.length === 0) {
    return { panels: [], failures: [] };
  }

  const panels: AttachmentPanel[] = [];
  const failures: VisualizationFailure[] = [];

  for (const { attachmentId, grid } of attachmentInputs) {
    try {
      const attachmentRecord = attachments.getAttachmentRecord(attachmentId);
      if (!attachmentRecord) {
        throw new Error(`Attachment "${attachmentId}" not found.`);
      }

      const latestVersion = getLatestVersion(attachmentRecord);
      if (!latestVersion) {
        throw new Error(`Attachment "${attachmentId}" does not have a readable version.`);
      }

      const resolvedPanels = resolvePanelsFromAttachment(attachmentRecord.type, latestVersion.data);
      panels.push(...resolvedPanels.map((panel) => ({ ...panel, grid })));
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error(
        `Error resolving dashboard panels from attachment "${attachmentId}": ${errorMessage}`
      );
      failures.push({
        type: 'attachment_panels',
        identifier: attachmentId,
        error: errorMessage,
      });
    }
  }

  logger.debug(
    `Resolved ${panels.length} panels from ${attachmentInputs.length} attachment references`
  );

  return { panels, failures };
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
