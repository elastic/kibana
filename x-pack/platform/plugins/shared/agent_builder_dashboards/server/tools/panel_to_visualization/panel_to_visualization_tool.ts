/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools/builtin';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  isDashboardAttachment,
  isDashboardPanelAttachment,
  type AttachmentPanel,
} from '@kbn/agent-builder-dashboards-common';
import {
  VISUALIZATION_ATTACHMENT_TYPE,
  type VisualizationAttachmentData,
} from '@kbn/agent-builder-visualizations-common';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  readEsqlQuery,
  type CustomContentState,
} from '@kbn/custom-content-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { dashboardTools } from '../../../common';
import { indexPanelsById } from '../generate/core/dashboard_state';
import { extractEsqlQueries } from '../generate/time_range/extract_esql_queries';

const MAX_QUERY_LENGTH = 2048;

const panelToVisualizationSchema = z.object({
  panel_attachment_id: z
    .string()
    .max(256)
    .describe(
      `Id of the ${DASHBOARD_PANEL_ATTACHMENT_TYPE} pointer attachment naming the panel to show, e.g. "${DASHBOARD_PANEL_ATTACHMENT_TYPE}-<panelId>".`
    ),
});

const getPanelTitle = ({ config }: AttachmentPanel): string | undefined =>
  typeof config.title === 'string' && config.title.length > 0 ? config.title : undefined;

/**
 * Maps a dashboard panel onto the visualization attachment payload its renderer expects. This is
 * the reverse of the attachment panel resolver: ES|QL Lens panels carry their Lens API config,
 * custom panels carry their template and optional query.
 */
const panelToVisualizationData = (
  panel: AttachmentPanel,
  query: string
): VisualizationAttachmentData => {
  if (panel.type === CUSTOM_CONTENT_EMBEDDABLE_TYPE) {
    const config = panel.config as Partial<CustomContentState>;
    if (!config.template) {
      throw new Error('This custom panel has no template yet, so there is nothing to show.');
    }
    const esql = readEsqlQuery(config);
    const title = getPanelTitle(panel);
    return {
      renderer: 'custom_content',
      query,
      visualization: { template: config.template, ...(title ? { title } : {}) },
      ...(esql ? { esql } : {}),
    };
  }

  if (panel.type === LENS_EMBEDDABLE_TYPE) {
    const [esql] = extractEsqlQueries([panel]);
    if (!esql) {
      throw new Error(
        'Only ES|QL Lens panels can be shown as a visualization; this Lens panel is not backed by ES|QL.'
      );
    }
    const chartType = typeof panel.config.type === 'string' ? panel.config.type : undefined;
    return {
      renderer: 'lens',
      query,
      visualization: panel.config,
      ...(chartType ? { chart_type: chartType } : {}),
      esql,
    };
  }

  throw new Error(
    `Panels of type "${panel.type}" cannot be shown as a visualization; only ES|QL Lens and custom panels can.`
  );
};

const errorResult = (message: string, panelAttachmentId: string) => ({
  results: [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.error,
      data: { message, metadata: { panel_attachment_id: panelAttachmentId } },
    },
  ],
});

/**
 * Copies the panel a pointer names into a standalone visualization attachment, so the agent can
 * show a dashboard panel inline in the chat without regenerating it.
 */
export const createPanelToVisualizationTool = (): BuiltinToolDefinition<
  typeof panelToVisualizationSchema
> => ({
  id: dashboardTools.panelToVisualization,
  type: ToolType.builtin,
  annotations: {
    title: 'Show Dashboard Panel As Visualization',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  tags: ['dashboard'],
  excludeFromMcp: true,
  description: `Show a dashboard panel inline in the chat as a standalone visualization.

Pass the id of a ${DASHBOARD_PANEL_ATTACHMENT_TYPE} pointer attachment. The tool copies that panel (its current config from the dashboard attachment) into a new visualization attachment and returns \`attachment_id\` and \`version\`. Render it as the last part of your response with \`<render_attachment id="{attachment_id}" version="{version}" />\`.

Use it when the user asks to see, show, paint or preview the panel here in the chat, or asks for it as a visualization. Never regenerate the panel with the visualization creation tool for that: it would author a different chart. Do not use this tool to change the panel; edits go through \`${dashboardTools.generateDashboard}\` with \`edit_panels\`. The copy is independent of the dashboard: later panel edits do not update it.

Supports ES|QL Lens panels and custom panels.`,
  schema: panelToVisualizationSchema,
  handler: async ({ panel_attachment_id: panelAttachmentId }, { attachments, logger }) => {
    const pointer = attachments.getAttachmentRecord(panelAttachmentId);
    if (!pointer || !isDashboardPanelAttachment(pointer)) {
      return errorResult(
        `"${panelAttachmentId}" is not a ${DASHBOARD_PANEL_ATTACHMENT_TYPE} attachment in this conversation.`,
        panelAttachmentId
      );
    }

    const pointerData = getLatestVersion(pointer)?.data;
    if (!pointerData) {
      return errorResult(
        `Panel pointer "${panelAttachmentId}" has no readable data.`,
        panelAttachmentId
      );
    }

    const { dashboard_attachment_id: dashboardAttachmentId, panel_id: panelId } = pointerData;
    const dashboard = attachments.getAttachmentRecord(dashboardAttachmentId);
    const dashboardData =
      dashboard && isDashboardAttachment(dashboard) ? getLatestVersion(dashboard)?.data : undefined;
    if (!dashboardData) {
      return errorResult(
        `Dashboard attachment "${dashboardAttachmentId}" named by the pointer is not in this conversation.`,
        panelAttachmentId
      );
    }

    const panel = indexPanelsById(dashboardData.panels).get(panelId);
    if (!panel) {
      return errorResult(
        `Panel "${panelId}" no longer exists on dashboard attachment "${dashboardAttachmentId}". Tell the user instead of recreating it.`,
        panelAttachmentId
      );
    }

    const title = getPanelTitle(panel) ?? pointerData.label;
    const query = (
      title
        ? `Panel "${title}" from dashboard "${dashboardData.title}"`
        : `Panel from dashboard "${dashboardData.title}"`
    ).slice(0, MAX_QUERY_LENGTH);

    let visualizationData: VisualizationAttachmentData;
    try {
      visualizationData = panelToVisualizationData(panel, query);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : String(error), panelAttachmentId);
    }

    try {
      const attachment = await attachments.add({
        type: VISUALIZATION_ATTACHMENT_TYPE,
        data: visualizationData,
        description: `Visualization: ${query.slice(0, 50)}`,
      });
      logger.debug(`Copied panel "${panelId}" into visualization attachment ${attachment.id}`);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.visualization,
            data: {
              attachment_id: attachment.id,
              version: attachment.current_version ?? 1,
              ...(visualizationData.renderer === 'custom_content'
                ? { renderer: 'custom_content' as const, visualization: { prompt: query } }
                : {
                    renderer: 'lens' as const,
                    visualization: visualizationData.visualization,
                    ...(visualizationData.chart_type
                      ? { chart_type: visualizationData.chart_type }
                      : {}),
                  }),
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to copy panel "${panelId}" into a visualization attachment: ${message}`);
      return errorResult(`Failed to save the visualization: ${message}`, panelAttachmentId);
    }
  },
});
