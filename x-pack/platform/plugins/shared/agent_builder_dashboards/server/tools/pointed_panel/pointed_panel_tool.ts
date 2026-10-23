/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import {
  SupportedChartType,
  ToolResultType,
  type ChartVisualizationResultData,
  type CustomContentVisualizationResultData,
  type VisualizationResultData,
} from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools/builtin';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  getPanelLabel,
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
import { extractEsqlQueries } from '../generate/time_range/extract_esql_queries';
import { resolvePointedPanel } from '../resolve_pointed_panel';

const MAX_QUERY_LENGTH = 2048;

type PersistedFields = 'attachment_id' | 'version';

/** A visualization tool result before the attachment backing it is persisted. */
type UnpersistedVisualizationResultData =
  | Omit<ChartVisualizationResultData, PersistedFields>
  | Omit<CustomContentVisualizationResultData, PersistedFields>;

const pointedPanelSchema = z.object({
  panel_attachment_id: z
    .string()
    .max(256)
    .describe(
      `Id of the ${DASHBOARD_PANEL_ATTACHMENT_TYPE} pointer attachment naming the panel, e.g. "${DASHBOARD_PANEL_ATTACHMENT_TYPE}-<panelId>".`
    ),
  action: z
    .enum(['read', 'show'])
    .describe(
      '"read" returns the panel\'s current config; "show" copies the panel into a visualization attachment to render inline in the chat.'
    ),
});

/**
 * Maps a dashboard panel onto the visualization attachment payload its renderer expects, plus the
 * tool result describing it. This is the reverse of the attachment panel resolver: ES|QL Lens
 * panels carry their Lens API config, custom panels carry their template and optional query.
 */
const panelToVisualization = (
  panel: AttachmentPanel,
  query: string
): {
  attachmentData: VisualizationAttachmentData;
  resultData: UnpersistedVisualizationResultData;
} => {
  if (panel.type === CUSTOM_CONTENT_EMBEDDABLE_TYPE) {
    const config = panel.config as Partial<CustomContentState>;
    if (!config.template) {
      throw new Error('This custom panel has no template yet, so there is nothing to show.');
    }
    const esql = readEsqlQuery(config);
    const title = getPanelLabel(panel);
    return {
      attachmentData: {
        renderer: 'custom_content',
        query,
        visualization: { template: config.template, ...(title ? { title } : {}) },
        ...(esql ? { esql } : {}),
      },
      resultData: {
        renderer: 'custom_content',
        visualization: { prompt: query },
        ...(esql ? { esql } : {}),
      },
    };
  }

  if (panel.type === LENS_EMBEDDABLE_TYPE) {
    const [esql] = extractEsqlQueries([panel]);
    if (!esql) {
      throw new Error(
        'Only ES|QL Lens panels can be shown as a visualization; this Lens panel is not backed by ES|QL.'
      );
    }
    const chartType = Object.values(SupportedChartType).find(
      (supportedChartType) => supportedChartType === panel.config.type
    );
    const chartTypeField = chartType ? { chart_type: chartType } : {};
    return {
      attachmentData: {
        renderer: 'lens',
        query,
        visualization: panel.config,
        ...chartTypeField,
        esql,
      },
      resultData: { renderer: 'lens', visualization: panel.config, ...chartTypeField, esql },
    };
  }

  throw new Error(
    `Panels of type "${panel.type}" cannot be shown as a visualization; only ES|QL Lens and custom panels can.`
  );
};

const getPanelEsql = (panel: AttachmentPanel): string | undefined => {
  if (panel.type === CUSTOM_CONTENT_EMBEDDABLE_TYPE) {
    return readEsqlQuery(panel.config as Partial<CustomContentState>);
  }
  if (panel.type === LENS_EMBEDDABLE_TYPE) {
    const [esql] = extractEsqlQueries([panel]);
    return esql;
  }
  return undefined;
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
 * Works on the one dashboard panel a pointer names: reads its config, or copies it into a
 * standalone visualization attachment so the agent can show it inline without regenerating it.
 */
export const createPointedPanelTool = (): BuiltinToolDefinition<typeof pointedPanelSchema> => ({
  id: dashboardTools.pointedPanel,
  type: ToolType.builtin,
  annotations: {
    title: 'Dashboard Panel',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  tags: ['dashboard'],
  excludeFromMcp: true,
  description: `Read or show the dashboard panel a ${DASHBOARD_PANEL_ATTACHMENT_TYPE} pointer attachment names, without reading the whole dashboard attachment.

Actions:
- \`read\`: returns the panel's id, type, title, current config and ES|QL query when it has one. Use it to answer a question about the panel or describe what it shows. Editing does not need it: \`${dashboardTools.generateDashboard}\` loads the panel's current config itself.
- \`show\`: copies the panel into a new visualization attachment and returns \`attachment_id\` and \`version\`. Render it as the last part of your response with \`<render_attachment id="{attachment_id}" version="{version}" />\`. Use it when the user asks to see, show, paint or preview the panel here in the chat, or asks for it as a visualization. Never regenerate the panel with the visualization creation tool for that: it would author a different chart. The copy is independent of the dashboard: later panel edits do not update it. Supports ES|QL Lens panels and custom panels.

This tool never changes the panel; edits go through \`${dashboardTools.generateDashboard}\` by panel id.`,
  schema: pointedPanelSchema,
  handler: async ({ panel_attachment_id: panelAttachmentId, action }, { attachments, logger }) => {
    const resolution = resolvePointedPanel(attachments, panelAttachmentId);
    if ('error' in resolution) {
      return errorResult(resolution.error, panelAttachmentId);
    }
    const { pointerData, dashboardData, panel } = resolution;
    const { panel_id: panelId } = pointerData;
    const title = getPanelLabel(panel) ?? pointerData.label;

    if (action === 'read') {
      const esql = getPanelEsql(panel);
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              panel_attachment_id: panelAttachmentId,
              dashboard_attachment_id: pointerData.dashboard_attachment_id,
              panel: {
                id: panel.id,
                type: panel.type,
                ...(title ? { title } : {}),
                config: panel.config,
              },
              ...(esql ? { esql } : {}),
            },
          },
        ],
      };
    }

    const dashboardName = dashboardData.title
      ? `dashboard "${dashboardData.title}"`
      : 'a dashboard';
    const query = (
      title ? `Panel "${title}" from ${dashboardName}` : `Panel from ${dashboardName}`
    ).slice(0, MAX_QUERY_LENGTH);

    let visualization: ReturnType<typeof panelToVisualization>;
    try {
      visualization = panelToVisualization(panel, query);
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : String(error), panelAttachmentId);
    }

    // The copy renders with the dashboard's time range, not whatever range the chat happens to have.
    const timeRange = dashboardData.time_range
      ? { time_range: { from: dashboardData.time_range.from, to: dashboardData.time_range.to } }
      : {};

    try {
      const attachment = await attachments.add({
        type: VISUALIZATION_ATTACHMENT_TYPE,
        data: { ...visualization.attachmentData, ...timeRange },
        description: `Visualization: ${query.slice(0, 50)}`,
      });
      logger.debug(`Copied panel "${panelId}" into visualization attachment ${attachment.id}`);

      const resultData: VisualizationResultData = {
        ...visualization.resultData,
        ...timeRange,
        attachment_id: attachment.id,
        version: attachment.current_version ?? 1,
      };

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.visualization,
            data: resultData,
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
