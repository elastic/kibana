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
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { MAX_VEGA_SPEC_LENGTH } from '@kbn/agent-builder-visualizations-common';

import { dashboardTools } from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import { summarizeDashboard } from './summarize_dashboard';
import { createVisPanelResolver, getErrorMessage } from './core';
import { runDashboardOrchestrator } from './orchestrator';
import { applyDefaultDashboardTimeRange } from './time_range';

const MAX_ADDITIONAL_CONTEXT_LENGTH = MAX_VEGA_SPEC_LENGTH + 8192;

const generateDashboardSchema = z
  .object({
    dashboardAttachmentId: z
      .string()
      .max(256)
      .optional()
      .describe(
        '(optional) The id of the dashboard attachment to update. Omit to create a new dashboard. The tool reads the current dashboard payload from this reference, so you never have to pass the full payload back in.'
      ),
    request: z
      .string()
      .min(1)
      .max(8192)
      .describe(
        'Natural-language description of the dashboard to build or the changes to make. Include everything relevant the user asked for: content, data sources, chart preferences, layout wishes, titles.'
      ),
    additionalContext: z
      .string()
      .max(MAX_ADDITIONAL_CONTEXT_LENGTH)
      .optional()
      .describe(
        '(optional) Extra context that helps fulfil the request: relevant index names, field names, validated ES|QL queries from prior tool results, a standalone visualization attachment config to add by value, or conversation facts the request refers to. Do NOT include the dashboard\'s own content (panel configs, queries of existing panels) — the tool reads the current dashboard from dashboardAttachmentId; reference panel ids in "request" instead.'
      ),
    additionalInstructions: z
      .string()
      .max(8192)
      .optional()
      .describe(
        '(optional) Standing instructions that shape HOW the dashboard is built (style, conventions, constraints), independent of the specific request.'
      ),
  })
  .strict();

/**
 * Kibana dashboard generation tool.
 *
 * Hands the natural-language request to an inner orchestrator agent that
 * authors and applies dashboard operations against the payload held in graph
 * state, with Kibana attachment persistence around it:
 * - the prior payload is read server-side from `dashboardAttachmentId`,
 * - the generated payload is persisted as a `dashboard` attachment,
 * - the result returns only the attachment id, version, a compact summary,
 *   unresolved visualization-generation failures, and the inner agent's final response text.
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
    description: `Generate or update a dashboard from a natural-language request.

An inner dashboard agent plans and applies the changes: it discovers the target data, creates visualizations from natural language (Lens or Vega), edits existing panels, arranges the layout, and manages sections and controls. Describe WHAT you want in "request" — the user's goal and the constraints the user stated. Do not design the dashboard yourself: never invent a panel list, chart types, or layout the user did not ask for.

Persists the resulting dashboard as an attachment and returns its id plus a compact summary (not the full payload). Reference the returned attachment id to render the dashboard; do not copy the payload into follow-up tool calls. Relay the returned response (including material decisions) and report any unresolved generation failures to the user.`,
    schema: generateDashboardSchema,
    handler: async (
      {
        dashboardAttachmentId: previousAttachmentId,
        request,
        additionalContext,
        additionalInstructions,
      },
      { logger, attachments, events, esClient, modelProvider }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, previousAttachmentId);
        const isNewDashboard = !latestVersion;
        const dashboardAttachmentId = previousAttachmentId ?? uuidv4();

        const model = await modelProvider.getDefaultModel();

        const { dashboard, failures, response } = await runDashboardOrchestrator({
          request,
          dashboard: latestVersion?.data,
          additionalContext,
          additionalInstructions,
          model,
          logger,
          esClient,
          resolvePanelContent: createVisPanelResolver({
            logger,
            modelProvider,
            events,
            esClient,
          }),
        });

        // Data-aware default time range computation
        const finalDashboardData = await applyDefaultDashboardTimeRange({
          dashboardData: dashboard,
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
                response,
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
                metadata: { dashboardAttachmentId: previousAttachmentId, request },
              },
            },
          ],
        };
      }
    },
  };
};
