/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  isDashboardPanelAttachment,
} from '@kbn/agent-builder-dashboards-common';
import {
  VISUALIZATION_ATTACHMENT_TYPE,
  getEffectiveRenderer,
  isCustomContentVisualization,
  readAttachmentQueries,
  type VisualizationAttachmentData,
  type VisualizationRenderer,
} from '@kbn/agent-builder-visualizations-common';
import {
  getRequestPanelEmbeddableType,
  type PanelContent,
  type PanelContentAttempt,
  type RequestPanelType,
} from '@kbn/dashboard-agent-authoring';
import { resolvePointedPanel } from '../../resolve_pointed_panel';

const PANEL_TYPE_BY_RENDERER: Readonly<Record<VisualizationRenderer, RequestPanelType>> = {
  lens: 'vis',
  vega: 'vega',
  custom_content: 'custom_content',
};

/** Maps a stored visualization payload onto the embeddable that renders it. */
const toPanelContent = (data: VisualizationAttachmentData): PanelContent => {
  const type = getRequestPanelEmbeddableType(PANEL_TYPE_BY_RENDERER[getEffectiveRenderer(data)]);

  // Custom content stores markup rather than a chart config, so its panel config is rebuilt.
  if (isCustomContentVisualization(data)) {
    const esqlQueries = readAttachmentQueries(data);
    return {
      type,
      config: {
        template: data.visualization.template,
        esql_query: esqlQueries.length ? esqlQueries : undefined,
      },
    };
  }

  return { type, config: data.visualization };
};

/**
 * Reads a visualization attachment, or a dashboard panel pointer, from the conversation and turns
 * it into panel content, so the model can place a visualization it already created, or copy a
 * panel the user pointed at, without copying the payload back through a tool call. Failures are
 * returned, not thrown, so one bad attachment fails only its own panel — the same way an
 * unresolvable panel request behaves.
 */
export const createAttachmentPanelResolver = ({
  attachments,
}: {
  attachments: AttachmentStateManager;
}) => {
  return (attachmentId: string): PanelContentAttempt => {
    const fail = (error: string): PanelContentAttempt => ({ type: 'failure', error });

    const record = attachments.getAttachmentRecord(attachmentId);
    if (!record) {
      return fail(`Attachment "${attachmentId}" not found in this conversation.`);
    }

    if (isDashboardPanelAttachment(record)) {
      // The copy is taken from the dashboard attachment's latest persisted version, so changes made
      // earlier in the same tool call are not reflected.
      const resolution = resolvePointedPanel(attachments, attachmentId);
      if ('error' in resolution) {
        return fail(resolution.error);
      }
      const { panel } = resolution;
      return { type: 'success', panelContent: { type: panel.type, config: panel.config } };
    }

    if (record.type !== VISUALIZATION_ATTACHMENT_TYPE) {
      return fail(
        `Attachment "${attachmentId}" is a "${record.type}" attachment; only ${VISUALIZATION_ATTACHMENT_TYPE} and ${DASHBOARD_PANEL_ATTACHMENT_TYPE} attachments can be added as panels.`
      );
    }

    const latestVersion = getLatestVersion(record);
    const data = latestVersion?.data as VisualizationAttachmentData | undefined;
    if (!data?.visualization) {
      return fail(`Attachment "${attachmentId}" has no readable visualization data.`);
    }

    return {
      type: 'success',
      panelContent: toPanelContent(data),
      ...(isCustomContentVisualization(data) ? { heightHint: data.visualization.height } : {}),
    };
  };
};
