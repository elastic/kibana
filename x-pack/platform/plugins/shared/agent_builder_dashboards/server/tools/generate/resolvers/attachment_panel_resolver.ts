/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  VISUALIZATION_ATTACHMENT_TYPE,
  getEffectiveRenderer,
  isCustomContentVisualization,
  type VisualizationAttachmentData,
} from '@kbn/agent-builder-visualizations-common';
import { toEsqlQueryState } from '@kbn/custom-content-common';
import {
  createPanelFailureResult,
  type InlinePanelOperationType,
  type PanelContent,
  type PanelContentAttempt,
  getRendererEmbeddableType,
} from '@kbn/dashboard-agent-authoring';

/** Maps a stored visualization payload onto the embeddable that renders it. */
const toPanelContent = (data: VisualizationAttachmentData): PanelContent => {
  const type = getRendererEmbeddableType(getEffectiveRenderer(data));

  // Custom content stores markup rather than a chart config, so its panel config is rebuilt.
  if (isCustomContentVisualization(data)) {
    return {
      type,
      config: {
        template: data.visualization.template,
        esql_query: toEsqlQueryState(data.esql),
      },
    };
  }

  return { type, config: data.visualization };
};

/**
 * Reads a visualization attachment from the conversation and turns its latest version into panel
 * content, so the model can place a visualization it already created without copying the payload
 * back through a tool call. Failures are returned, not thrown, so one bad attachment fails only its
 * own panel — the same way an unresolvable panel request behaves.
 */
export const createAttachmentPanelResolver = ({
  attachments,
}: {
  attachments: AttachmentStateManager;
}) => {
  return (attachmentId: string, operationType: InlinePanelOperationType): PanelContentAttempt => {
    const fail = (error: string) => createPanelFailureResult(operationType, attachmentId, error);

    const record = attachments.getAttachmentRecord(attachmentId);
    if (!record) {
      return fail(`Attachment "${attachmentId}" not found in this conversation.`);
    }

    if (record.type !== VISUALIZATION_ATTACHMENT_TYPE) {
      return fail(
        `Attachment "${attachmentId}" is a "${record.type}" attachment; only ${VISUALIZATION_ATTACHMENT_TYPE} attachments can be added as panels.`
      );
    }

    const latestVersion = getLatestVersion(record);
    const data = latestVersion?.data as VisualizationAttachmentData | undefined;
    if (!data?.visualization) {
      return fail(`Attachment "${attachmentId}" has no readable visualization data.`);
    }

    return { type: 'success', panelContent: toPanelContent(data) };
  };
};
