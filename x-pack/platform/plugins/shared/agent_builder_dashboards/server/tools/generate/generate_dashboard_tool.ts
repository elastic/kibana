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

import { dashboardTools } from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import { applyDashboardOperations } from './apply_dashboard_operations';
import {
  getErrorMessage,
  hasValidCreateMetadataOperations,
  dashboardOperationSchema,
} from './core';
import { summarizeDashboard } from './summarize_dashboard';

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

/**
 * Kibana dashboard generation tool.
 *
 * Wraps the environment-agnostic {@link executeDashboardOperations} core with
 * Kibana attachment persistence so the LLM works against a lightweight reference:
 * - the prior payload is read server-side from `dashboardAttachmentId`,
 * - the generated payload is persisted as a `dashboard` attachment,
 * - the result returns only the attachment id, version, and a compact dashboard summary.
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
7. add / remove controls (interactive filters pinned above the dashboard: dropdown, range slider, or time slider)
8. add / edit custom content panels (\`source: "config"\`, \`type: "custom_content"\`) for HTML-based layouts that Lens and Vega cannot express`,
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

        const {
          attachment,
          dashboardData: finalDashboardData,
          failures,
          panelAuthoringNotes,
        } = await applyDashboardOperations({
          attachments,
          dashboardAttachmentId,
          existingDashboard: latestVersion?.data,
          operations,
          createNew: isNewDashboard,
          logger,
          events,
          esClient,
          modelProvider,
          customContentEnabled: true,
        });

        logger.info(`Dashboard payload ${isNewDashboard ? 'generated' : 'updated'}`);

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                attachment_id: attachment.id,
                version: attachment.current_version ?? 1,
                dashboard: summarizeDashboard(
                  finalDashboardData,
                  new Map(
                    panelAuthoringNotes.map(({ panelId, authoringNote }) => [
                      panelId,
                      authoringNote,
                    ])
                  )
                ),
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
                metadata: { dashboardAttachmentId: previousAttachmentId, operations },
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
