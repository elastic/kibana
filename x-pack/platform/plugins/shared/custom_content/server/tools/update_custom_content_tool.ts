/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools/builtin';
import { customContentPanelUpdateSchema, resolveEsqlQueryEdit } from '@kbn/custom-content-common';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  type CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';
import { readPanelContextData } from '../../common/read_panel_context_data';

const updateCustomContentSchema = customContentPanelUpdateSchema;

/**
 * Id of the dashboard generation tool, named in agent-facing copy so the agent can fall back to it
 * for panels that have no context attachment. Inlined rather than imported from
 * `@kbn/agent-builder-dashboards-common` to avoid a plugin dependency for a prompt string; keep in
 * sync with `dashboardTools.generateDashboard` there.
 */
const GENERATE_DASHBOARD_TOOL_ID = 'platform.dashboard.generate_dashboard';

/**
 * Only panels the user explicitly sent to chat have a context attachment, but any panel on the
 * attached dashboard can still be edited through the dashboard tool, which targets by `panelId` and
 * needs no attachment. Spelling that route out is what stops the agent from dead-ending — left to
 * itself it invents remediations like asking the user to click the panel, which attaches nothing.
 */
const NOT_ATTACHED_REMEDIATION =
  `If this panel is on the dashboard attached to this conversation, do not ask the user for anything — edit it with \`${GENERATE_DASHBOARD_TOOL_ID}\` using an \`edit_panels\` operation with \`source: "config"\`, \`type: "custom_content"\`, and the panel's \`panelId\` (read the dashboard attachment to find it; for a dashboard panel the panelId is the same value as embeddable_id). ` +
  'Only if no dashboard is attached, ask the user to open that panel\'s context menu, choose Edit, then "Refine with chat". Never suggest clicking the panel — that attaches nothing.';

export const createUpdateCustomContentTool = (): BuiltinToolDefinition<
  typeof updateCustomContentSchema
> => ({
  id: 'custom_content_update_panel',
  type: ToolType.builtin,
  annotations: {
    title: 'Update Custom Content Panel',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  tags: ['custom_content'],
  excludeFromMcp: true,
  description: `Update the custom content panel from a natural-language prompt and/or a new ES|QL query.

- Provide \`prompt\` to describe what to create or change. The server generates the HTML template.
- When \`esqlQuery\` is also changing, the server samples the new schema before generating so the template matches the data.
- When only \`prompt\` is provided (style or layout change, no query change), the server refines the existing template directly — no query sampling, preserving layout and design.
- Pass \`esqlQuery: null\` to remove the query entirely.

This tool only reaches panels whose context is attached to the conversation — that happens when the user picks "Refine with chat" on a panel. For any other custom content panel on the attached dashboard, use \`${GENERATE_DASHBOARD_TOOL_ID}\` with an \`edit_panels\` operation instead; it targets by \`panelId\` and needs no attachment.

On success this returns \`attachment_id\` and \`version\`. You MUST render the updated panel inline as the last part of your response by emitting \`<render_attachment id="{attachment_id}" version="{version}" />\` — without it the user cannot preview or step back through earlier versions of the panel.`,
  schema: updateCustomContentSchema,
  handler: async (
    { embeddable_id, prompt, esqlQuery },
    { attachments, logger, esClient, modelProvider }
  ) => {
    const panelAttachments = attachments
      .getAll()
      .filter((a) => a.type === CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE);
    const contextAttachment = panelAttachments.find(
      (a) => readPanelContextData(a)?.embeddable_id === embeddable_id
    );

    if (!contextAttachment) {
      logger.warn(
        `custom_content_update_panel: no custom_content_context attachment found for embeddable_id "${embeddable_id}"`
      );
      const availableIds = panelAttachments
        .map((a) => readPanelContextData(a)?.embeddable_id)
        .filter(Boolean);
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: {
              message: availableIds.length
                ? `No custom content panel with embeddable_id "${embeddable_id}" is attached to this conversation. Attached panels: ${availableIds.join(
                    ', '
                  )}. ${NOT_ATTACHED_REMEDIATION}`
                : `No custom content panel is attached to this conversation. ${NOT_ATTACHED_REMEDIATION}`,
            },
          },
        ],
      };
    }

    const currentData = readPanelContextData(contextAttachment);

    const { query: resolvedQuery, isChanging: isQueryChanging } = resolveEsqlQueryEdit(
      esqlQuery,
      currentData?.esql_query
    );

    let resolvedTemplate: string = currentData?.panel_template ?? '';
    if (prompt !== undefined) {
      try {
        const resolver = createCustomContentTemplateResolver({ modelProvider, esClient, logger });
        ({ template: resolvedTemplate } = await resolver({
          prompt,
          esqlQuery: isQueryChanging ? resolvedQuery : undefined,
          existingTemplate: currentData?.panel_template || undefined,
          hasExistingQuery: !isQueryChanging && !!resolvedQuery,
        }));
      } catch (err) {
        logger.error(`custom_content_update_panel: template resolver failed — ${err}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Template generation failed: ${
                  err instanceof Error ? err.message : String(err)
                }`,
              },
            },
          ],
        };
      }
    }

    const newData: CustomContentContextAttachmentData = {
      panel_template: resolvedTemplate,
      esql_query: resolvedQuery,
      panel_title: currentData?.panel_title,
      embeddable_id: currentData?.embeddable_id ?? '',
      // Carried over so a refined version still previews against the range the panel was
      // sent with, rather than silently reverting to the default.
      ...(currentData?.time_range ? { time_range: currentData.time_range } : {}),
    };

    const updated = await attachments.update(
      contextAttachment.id,
      { data: newData },
      ATTACHMENT_REF_ACTOR.agent
    );

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            message: 'Panel updated successfully.',
            attachment_id: contextAttachment.id,
            version: updated?.current_version,
          },
        },
      ],
    };
  },
});
