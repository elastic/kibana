/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';

import { dashboardTools } from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import {
  createPanelContentResolver,
  executeDashboardOperations,
  getErrorMessage,
  hasValidCreateMetadataOperations,
  dashboardOperationSchema,
} from './core';

const newDashboardMetadataErrorMessage =
  'New dashboards require a set_metadata operation with a non-empty title.';

const generateDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) The id of the dashboard attachment to update. Omit to create a new dashboard. The tool reads the current dashboard payload from this reference, so you never have to pass the full payload back in.'
    ),
  operations: z.array(dashboardOperationSchema).min(1),
});

const QUERY_EXPRESSION_PREVIEW_LENGTH = 120;
const MARKDOWN_CONTENT_PREVIEW_LENGTH = 60;

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

/**
 * Cheap per-panel identity hints so the model can target panels in follow-up
 * operations without ever seeing full configs: Lens panels expose the chart
 * type and title read from their API-format config (top-level `type`/`title`),
 * markdown panels a short content preview.
 */
const summarizePanel = (panel: AttachmentPanel) => {
  const summary: {
    type: string;
    id: string;
    grid: AttachmentPanel['grid'];
    chart_type?: string;
    title?: string;
    content_preview?: string;
  } = { type: panel.type, id: panel.id, grid: panel.grid };

  if (panel.type === LENS_EMBEDDABLE_TYPE) {
    const { type: chartType, title } = panel.config;
    if (typeof chartType === 'string') {
      summary.chart_type = chartType;
    }
    if (typeof title === 'string' && title.length > 0) {
      summary.title = title;
    }
  } else if (panel.type === MARKDOWN_EMBEDDABLE_TYPE) {
    const { content } = panel.config;
    if (typeof content === 'string') {
      summary.content_preview = truncate(content, MARKDOWN_CONTENT_PREVIEW_LENGTH);
    }
  }

  return summary;
};

/**
 * Compact projection of a dashboard payload, returned in the tool result.
 *
 * The full dashboard payload lives in the dashboard attachment (referenced by
 * id); the LLM only ever sees this slim summary, so it never has to re-emit the
 * heavy payload into a follow-up tool call. Every dashboard-level field the
 * model can write is echoed back here (summary parity) — absent or empty fields
 * are omitted entirely to keep the summary compact.
 */
const summarizeDashboard = (dashboardData: DashboardAttachmentData) => {
  const {
    title,
    description,
    time_range: timeRange,
    tags,
    query,
    filters,
    pinned_panels: pinnedPanels,
    refresh_interval: refreshInterval,
    panels,
  } = dashboardData;

  return {
    title,
    description,
    ...(timeRange !== undefined && { time_range: timeRange }),
    ...(tags !== undefined && tags.length > 0 && { tags }),
    ...(query !== undefined && {
      query: {
        language: query.language,
        expression: truncate(
          typeof query.expression === 'string'
            ? query.expression
            : JSON.stringify(query.expression),
          QUERY_EXPRESSION_PREVIEW_LENGTH
        ),
      },
    }),
    ...(filters !== undefined && filters.length > 0 && { filters_count: filters.length }),
    ...(pinnedPanels !== undefined &&
      pinnedPanels.length > 0 && { controls_count: pinnedPanels.length }),
    ...(refreshInterval !== undefined && { refresh_interval: refreshInterval }),
    panels: panels.map((widget) => {
      if (isSection(widget)) {
        return {
          id: widget.id,
          title: widget.title,
          collapsed: widget.collapsed,
          grid: widget.grid,
          panels: widget.panels.map(summarizePanel),
        };
      }
      return summarizePanel(widget);
    }),
  };
};

/**
 * Kibana dashboard generation tool.
 *
 * Wraps the environment-agnostic {@link executeDashboardOperations} core with
 * Kibana attachment persistence so the LLM works against a lightweight reference:
 * - the prior payload is read server-side from `dashboardAttachmentId`,
 * - the generated payload is persisted as a `dashboard` attachment,
 * - the result returns only the attachment id, version, and a compact summary.
 *
 * This keeps the heavy payload out of the LLM transcript — the model references
 * the attachment id to render it rather than copying it into the next tool call.
 */
export const generateDashboardTool = (): BuiltinSkillBoundedTool<
  typeof generateDashboardSchema
> => {
  return {
    id: dashboardTools.generateDashboard,
    type: ToolType.builtin,
    description: `Generate or update a dashboard from ordered operations.

Persists the resulting dashboard as an attachment and returns its id plus a compact summary (not the full payload). Reference the returned attachment id to render the dashboard; do not copy the payload into follow-up tool calls.

Use operations[] to:
1. set metadata
2. add panels (resolved panel configs or visualizations from natural language)
3. edit existing Lens or markdown panel content
4. update panel layouts without changing content
5. add / remove sections, including inline section panels during add_section
6. remove panels`,
    schema: generateDashboardSchema,
    handler: async (
      { dashboardAttachmentId: previousAttachmentId, operations },
      { logger, attachments, events, esClient, modelProvider }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, previousAttachmentId);
        const isNewDashboard = !latestVersion;

        if (isNewDashboard && !hasValidCreateMetadataOperations(operations)) {
          logger.error(newDashboardMetadataErrorMessage);
          return missingNewDashboardMetadataErrorResult;
        }

        const dashboardAttachmentId = previousAttachmentId ?? uuidv4();

        const { dashboardData, failures, sectionRefs } = await executeDashboardOperations({
          dashboardData: latestVersion?.data,
          operations,
          logger,
          resolvePanelContent: createPanelContentResolver({
            logger,
            modelProvider,
            events,
            esClient,
          }),
        });

        const description = `Dashboard: ${dashboardData.title}`;
        const attachment = isNewDashboard
          ? await attachments.add({
              id: dashboardAttachmentId,
              type: DASHBOARD_ATTACHMENT_TYPE,
              description,
              data: dashboardData,
            })
          : await attachments.update(dashboardAttachmentId, {
              data: dashboardData,
              description,
            });

        if (!attachment) {
          throw new Error(`Failed to persist dashboard attachment "${dashboardAttachmentId}".`);
        }

        logger.info(`Dashboard payload ${isNewDashboard ? 'generated' : 'updated'}`);

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                attachment_id: attachment.id,
                version: attachment.current_version ?? 1,
                dashboard: summarizeDashboard(dashboardData),
                // Maps each add_section `ref` declared in this call to the real section id.
                section_refs: sectionRefs.size > 0 ? Object.fromEntries(sectionRefs) : undefined,
                failures: failures.length > 0 ? failures : undefined,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in generate_dashboard tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to generate dashboard: ${errorMessage}`,
                metadata: { dashboardAttachmentId: previousAttachmentId },
              },
            },
          ],
        };
      }
    },
  };
};

const missingNewDashboardMetadataErrorResult = {
  results: [
    {
      type: ToolResultType.error,
      data: {
        message: newDashboardMetadataErrorMessage,
      },
    },
  ],
};
