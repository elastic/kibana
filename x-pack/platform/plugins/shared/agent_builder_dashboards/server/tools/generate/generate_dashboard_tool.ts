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

import { dashboardTools } from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import {
  createVisPanelResolver,
  executeDashboardOperations,
  getErrorMessage,
  hasValidCreateMetadataOperations,
  dashboardOperationSchema,
} from './core';
import { indexPanelsById } from './core/dashboard_state';
import { summarizePanelConfig } from './core/panel_config';
import { prettifyPanelConfigs, type ConfigGeneratorChange } from './core/prettify_panel_configs';
import { applyDefaultDashboardTimeRange } from './time_range';

const newDashboardMetadataErrorMessage =
  'New dashboards require a set_metadata operation with a non-empty title.';

const generateDashboardSchema = z
  .object({
    dashboardAttachmentId: z
      .string()
      .max(256)
      .optional()
      .describe(
        '(optional) The id of the dashboard attachment to update. Omit to create a new dashboard. The tool reads the current dashboard payload from this reference, so you never have to pass the full payload back in.'
      ),
    operations: z.array(dashboardOperationSchema),
    prettifyPanelConfigs: z
      .boolean()
      .optional()
      .describe(
        '(optional) Refresh surviving pre-existing ES|QL Lens panel configs. Strong default: do not set this for normal create or update requests because generated panels already follow chart best practices. Set it only when the user explicitly asks to prettify, polish, or improve the visualization configs of an existing dashboard.'
      ),
  })
  .check((ctx) => {
    if (ctx.value.operations.length === 0 && !ctx.value.prettifyPanelConfigs) {
      ctx.issues.push({
        code: 'custom',
        message: 'At least one operation or prettifyPanelConfigs: true is required.',
        input: ctx.value,
        path: ['operations'],
      });
    }
  });

const summarizePanel = (panel: AttachmentPanel) => ({
  type: panel.type,
  id: panel.id,
  grid: panel.grid,
  config: summarizePanelConfig(panel.config),
});

/**
 * Compact projection of a dashboard payload, returned in the tool result.
 *
 * The full dashboard payload lives in the dashboard attachment (referenced by
 * id); the LLM only ever sees this slim summary, so it never has to re-emit the
 * heavy payload into a follow-up tool call.
 */
export const summarizeDashboard = (dashboardData: DashboardAttachmentData) => ({
  title: dashboardData.title,
  description: dashboardData.description,
  panels: dashboardData.panels.map((widget) => {
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
  controls: (dashboardData.pinned_panels ?? []).map((control) => {
    const c = control as { id?: string; type?: string; config?: { title?: string } };
    return { id: c.id, type: c.type, title: c.config?.title };
  }),
});

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
2. add panels (resolved panel configs, or Lens/Vega visualizations from a natural-language query — pick the engine with the panel "renderer" field; defaults to Lens)
3. edit existing Lens, Vega, or markdown panel content
4. update panel layouts without changing content
5. add / remove sections, including inline section panels during add_section
6. remove panels
7. add / remove controls (interactive filters pinned above the dashboard: dropdown, range slider, or time slider)`,
    schema: generateDashboardSchema,
    handler: async (
      { dashboardAttachmentId: previousAttachmentId, operations, prettifyPanelConfigs: prettify },
      { logger, attachments, events, esClient, modelProvider }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, previousAttachmentId);
        const isNewDashboard = !latestVersion;
        const existingPanels = latestVersion
          ? [...indexPanelsById(latestVersion.data.panels).values()]
          : [];

        if (isNewDashboard && !hasValidCreateMetadataOperations(operations)) {
          logger.error(newDashboardMetadataErrorMessage);
          return missingNewDashboardMetadataErrorResult;
        }

        const dashboardAttachmentId = previousAttachmentId ?? uuidv4();
        const resolvePanelContent = createVisPanelResolver({
          logger,
          modelProvider,
          events,
          esClient,
        });

        const operationResult = await executeDashboardOperations({
          dashboardData: latestVersion?.data,
          operations,
          logger,
          resolvePanelContent,
        });
        let dashboardData = operationResult.dashboardData;
        const { failures, contentResolvedPanelIds } = operationResult;
        let configGeneratorChanges: ConfigGeneratorChange[] = [];

        if (prettify) {
          const prettifyResult = await prettifyPanelConfigs({
            dashboardData,
            existingPanels,
            resolvePanelContent,
            skipPanelIds: contentResolvedPanelIds,
          });
          dashboardData = prettifyResult.dashboardData;
          failures.push(...prettifyResult.failures);
          configGeneratorChanges = prettifyResult.configGeneratorChanges;
        }

        // Data-aware default time range computation
        const finalDashboardData = await applyDefaultDashboardTimeRange({
          dashboardData,
          esClient,
          logger,
        });

        const description = `Dashboard: ${finalDashboardData.title}`;
        const attachment = isNewDashboard
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

        logger.info(`Dashboard payload ${isNewDashboard ? 'generated' : 'updated'}`);

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                attachment_id: attachment.id,
                version: attachment.current_version ?? 1,
                dashboard: summarizeDashboard(finalDashboardData),
                failures: failures.length > 0 ? failures : undefined,
                configGeneratorChanges:
                  configGeneratorChanges.length > 0 ? configGeneratorChanges : undefined,
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
                metadata: {
                  dashboardAttachmentId: previousAttachmentId,
                  operations,
                  prettifyPanelConfigs: prettify,
                },
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
