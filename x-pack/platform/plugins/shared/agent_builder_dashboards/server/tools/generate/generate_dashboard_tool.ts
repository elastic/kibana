/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';

import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import { DASHBOARD_APPLY_UI_EVENT, dashboardTools } from '../../../common';
import { retrieveLatestVersion } from './attachment_state';
import {
  createVisPanelResolver,
  executeDashboardOperations,
  getErrorMessage,
  hasValidCreateMetadataOperations,
  dashboardOperationSchema,
  indexPanelsById,
  prettifyPanelConfigs,
} from './core';
import { applyDefaultDashboardTimeRange } from './time_range';
import { persistDashboardAttachment } from './persist_dashboard_attachment';

const newDashboardMetadataErrorMessage =
  'New dashboards require a set_metadata operation with a non-empty title.';

const generateDashboardSchema = z
  .object({
    dashboardAttachmentId: z
      .string()
      .max(256)
      .optional()
      .describe(
        '(optional) The id of the dashboard attachment or draft to update. Omit to create a new dashboard. After a draft call (persistAttachment: false), pass the returned draft_id here. The tool reads the current dashboard payload from this reference, so you never have to pass the full payload back in.'
      ),
    operations: z.array(dashboardOperationSchema),
    prettifyPanelConfigs: z
      .boolean()
      .optional()
      .describe(
        '(optional) Refresh surviving pre-existing ES|QL Lens panel configs. Strong default: do not set this for normal create or update requests because generated panels already follow chart best practices. Set it only when the user explicitly asks to prettify, polish, or improve the visualization configs of an existing dashboard.'
      ),
    persistAttachment: z
      .boolean()
      .optional()
      .describe(
        '(optional) When false, applies the dashboard to the live UI and keeps a hidden draft only — no user-visible attachment yet. Use false during generate → fix loops; set true (or omit, default true) on the final call so a single attachment is published. Do not render_attachment until persistAttachment is true / data.persisted is true.'
      ),
  })
  .check((ctx) => {
    if (ctx.value.prettifyPanelConfigs && !ctx.value.dashboardAttachmentId) {
      ctx.issues.push({
        code: 'custom',
        message: 'dashboardAttachmentId is required when prettifyPanelConfigs is true.',
        input: ctx.value,
        path: ['dashboardAttachmentId'],
      });
    }

    const persistAttachment = ctx.value.persistAttachment !== false;
    const finalizeOnly =
      persistAttachment &&
      Boolean(ctx.value.dashboardAttachmentId) &&
      ctx.value.operations.length === 0 &&
      !ctx.value.prettifyPanelConfigs;

    if (ctx.value.operations.length === 0 && !ctx.value.prettifyPanelConfigs && !finalizeOnly) {
      ctx.issues.push({
        code: 'custom',
        message:
          'At least one operation or prettifyPanelConfigs: true is required (unless finalizing an existing draft with persistAttachment: true).',
        input: ctx.value,
        path: ['operations'],
      });
    }
  });

/**
 * Compact projection of a dashboard payload, returned in the tool result.
 *
 * The full dashboard payload lives in the dashboard attachment (referenced by
 * id); the LLM only ever sees this slim summary, so it never has to re-emit the
 * heavy payload into a follow-up tool call.
 *
 * `authoringNotesByPanelId` holds the one-sentence note describing every chart
 * authored in this run, keyed by panel id. Panels that were not authored now
 * (or whose engine returned no note) simply have no `authoring_note`.
 */
export const summarizeDashboard = (
  dashboardData: DashboardAttachmentData,
  authoringNotesByPanelId: Map<string, string>
) => ({
  title: dashboardData.title,
  description: dashboardData.description,
  panels: dashboardData.panels.map((widget) => {
    if (isSection(widget)) {
      return {
        id: widget.id,
        title: widget.title,
        collapsed: widget.collapsed,
        grid: widget.grid,
        panels: widget.panels.map((panel) => ({
          type: panel.type,
          id: panel.id,
          grid: panel.grid,
          authoring_note: authoringNotesByPanelId.get(panel.id),
        })),
      };
    }
    return {
      type: widget.type,
      id: widget.id,
      grid: widget.grid,
      authoring_note: authoringNotesByPanelId.get(widget.id),
    };
  }),
  controls: (dashboardData.pinned_panels ?? []).map((control) => {
    const c = control as { id?: string; type?: string; config?: { title?: string } };
    return { id: c.id, type: c.type, title: c.config?.title };
  }),
});

const CUSTOM_CONTENT_TOOL_GUIDANCE = `
8. add / edit custom content panels (\`source: "config"\`, \`type: "custom_content"\`) for HTML-based layouts that Lens and Vega cannot express, such as KPI scorecards with colored status badges, health/status boards, or panels that mix narrative text with live data values.

**Custom content panel type selection:**
Use custom content only as a last resort:
- Any standard time series, bar, pie, metric, or data table → use Lens.
- Scatter plots, faceted charts, layered charts, combination charts → use Vega.
- Plain explanatory text with no data → use markdown.
- The content needs an HTML/CSS layout no single Lens chart type can express, or mixes narrative text with live data, or the user explicitly asks for a custom/HTML panel → use custom content.

**Creating a custom content panel:**
- Set \`config.prompt\` to a concise description of what to display. Do not supply \`template\` — it is generated server-side from the prompt.
- Optionally set \`config.esqlQuery\` when the panel needs live data.

**Editing a custom content panel:**
- Use \`edit_panels\` (\`source: "config"\`, \`type: "custom_content"\`) and set \`panelId\` to the target panel.
- Supply only \`prompt\` and/or \`esqlQuery\` — omit fields that should stay unchanged. The server regenerates the template from the merged prompt and query. Do not supply \`template\`.`;

/**
 * Kibana dashboard generation tool.
 *
 * Wraps the environment-agnostic {@link executeDashboardOperations} core with
 * Kibana attachment persistence so the LLM works against a lightweight reference:
 * - the prior payload is read server-side from `dashboardAttachmentId`,
 * - drafts (`persistAttachment: false`) stay hidden until a final publish,
 * - the result returns only ids, version (when persisted), and a compact summary.
 *
 * This keeps the heavy payload out of the LLM transcript — the model references
 * the attachment id to render it rather than copying it into the next tool call.
 */
export const generateDashboardTool = ({
  customContentEnabled = true,
}: {
  customContentEnabled?: boolean;
} = {}): BuiltinSkillBoundedTool<typeof generateDashboardSchema> => {
  return {
    id: dashboardTools.generateDashboard,
    type: ToolType.builtin,
    description: `Generate or update a dashboard from ordered operations.

By default (\`persistAttachment\` omitted/true) persists a user-visible dashboard attachment and returns its id, version, and a compact summary. During generate → fix loops, set \`persistAttachment: false\` so only a hidden draft is kept and the live dashboard is updated mid-round; pass the returned \`draft_id\` as \`dashboardAttachmentId\` on follow-ups. When the layout looks good, call again with \`persistAttachment: true\` (operations may be empty) to publish a single attachment — only then use render_attachment.

If a dashboard screenshot is attached to this conversation, it is already included as visual input — use it to assess layout quality. Do not capture another screenshot.

Use operations[] to:
1. set metadata
2. add panels (resolved panel configs, or Lens/Vega visualizations from a natural-language query — pick the engine with the panel "renderer" field; defaults to Lens)
3. edit existing Lens, Vega, or markdown panel content
4. update panel layouts without changing content
5. add / remove sections, including inline section panels during add_section
6. remove panels
7. add / remove controls (interactive filters pinned above the dashboard: dropdown, range slider, or time slider)${
      customContentEnabled ? CUSTOM_CONTENT_TOOL_GUIDANCE : ''
    }`,
    schema: generateDashboardSchema,
    handler: async (
      {
        dashboardAttachmentId: previousAttachmentId,
        operations,
        prettifyPanelConfigs: prettify,
        persistAttachment: persistAttachmentParam,
      },
      { logger, attachments, events, esClient, modelProvider }
    ) => {
      const persistAttachment = persistAttachmentParam !== false;

      try {
        const latestVersion = retrieveLatestVersion(attachments, previousAttachmentId);
        const isNewDashboard = !latestVersion;
        const existingPanels = latestVersion
          ? [...indexPanelsById(latestVersion.data.panels).values()]
          : [];

        if (
          isNewDashboard &&
          operations.length > 0 &&
          !hasValidCreateMetadataOperations(operations)
        ) {
          logger.error(newDashboardMetadataErrorMessage);
          return missingNewDashboardMetadataErrorResult;
        }

        // Finalize-only: publish the current draft with no further ops.
        if (persistAttachment && operations.length === 0 && !prettify && latestVersion) {
          const description = `Dashboard: ${latestVersion.data.title}`;
          const published = await persistDashboardAttachment({
            attachments,
            previousAttachmentId,
            dashboardData: latestVersion.data,
            description,
            persistAttachment: true,
          });

          events.sendUiEvent(DASHBOARD_APPLY_UI_EVENT, {
            attachment_id: published.attachmentId,
            data: latestVersion.data,
          });

          return {
            results: [
              {
                type: ToolResultType.dashboard,
                tool_result_id: getToolResultId(),
                data: {
                  attachment_id: published.attachmentId,
                  version: published.version,
                  persisted: true,
                  dashboard: summarizeDashboard(latestVersion.data, new Map()),
                },
              },
            ],
          };
        }

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
          resolveCustomContentTemplate: customContentEnabled
            ? createCustomContentTemplateResolver({ logger, modelProvider, esClient })
            : undefined,
        });
        const { failures, panelAuthoringNotes, contentResolvedPanelIds } = operationResult;
        let dashboardData = operationResult.dashboardData;

        if (prettify) {
          const prettifyResult = await prettifyPanelConfigs({
            dashboardData,
            existingPanels,
            resolvePanelContent,
            skipPanelIds: contentResolvedPanelIds,
          });
          dashboardData = prettifyResult.dashboardData;
          failures.push(...prettifyResult.failures);
          panelAuthoringNotes.push(...prettifyResult.panelAuthoringNotes);
        }

        // Data-aware default time range computation
        const finalDashboardData = await applyDefaultDashboardTimeRange({
          dashboardData,
          esClient,
          logger,
        });

        const description = `Dashboard: ${finalDashboardData.title}`;
        const persistedResult = await persistDashboardAttachment({
          attachments,
          previousAttachmentId,
          dashboardData: finalDashboardData,
          description,
          persistAttachment,
        });

        // Push the new payload to the open dashboard app immediately so the user
        // sees live updates (round_complete is too late for in-round iteration).
        events.sendUiEvent(DASHBOARD_APPLY_UI_EVENT, {
          attachment_id: persistedResult.attachmentId,
          data: finalDashboardData,
        });

        logger.info(
          `Dashboard payload ${persistedResult.persisted ? 'persisted' : 'drafted'} (${
            persistedResult.attachmentId
          })`
        );

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                ...(persistedResult.persisted
                  ? {
                      attachment_id: persistedResult.attachmentId,
                      version: persistedResult.version,
                    }
                  : {
                      draft_id: persistedResult.draftId ?? persistedResult.attachmentId,
                    }),
                persisted: persistedResult.persisted,
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
                metadata: {
                  dashboardAttachmentId: previousAttachmentId,
                  operations,
                  prettifyPanelConfigs: prettify,
                  persistAttachment,
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
