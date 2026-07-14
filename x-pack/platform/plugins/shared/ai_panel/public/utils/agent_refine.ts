/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import {
  AI_PANEL_CONTEXT_ATTACHMENT_TYPE,
  type AiPanelContextAttachmentData,
} from '../../common/panel_context_attachment';
import { AI_PANEL_MAX_PROMPT_LENGTH, AI_PANEL_MAX_ESQL_QUERY_LENGTH } from '../../common/constants';

export const AI_PANEL_REFINE_SESSION_TAG = 'ai_panel';

export function buildAiPanelContextAttachment(
  prompt: string,
  esqlQuery: string | undefined
): AttachmentInput<typeof AI_PANEL_CONTEXT_ATTACHMENT_TYPE, AiPanelContextAttachmentData> {
  return {
    type: AI_PANEL_CONTEXT_ATTACHMENT_TYPE,
    data: {
      panel_instructions: prompt,
      esql_query: esqlQuery ?? '',
    },
  };
}

const updateAiPanelConfigSchema = z
  .object({
    prompt: z
      .string()
      .min(1)
      .max(AI_PANEL_MAX_PROMPT_LENGTH)
      .optional()
      .describe(
        'The updated panel instructions, if the user wants to change what the panel shows or how it looks. Omit if unchanged. Describe WHAT the panel should show, not HOW to build it — this panel renders in a sandboxed, scripting-disabled iframe, so JavaScript never runs there. Do not mention JavaScript, onclick/onmouseover handlers, or any scripted behavior; if the user asks for interactivity like a hover tooltip, just describe the desired outcome (e.g. "show the value on hover") — it will be implemented with CSS alone.'
      ),
    esqlQuery: z
      .string()
      .max(AI_PANEL_MAX_ESQL_QUERY_LENGTH)
      .optional()
      .describe(
        'The updated ES|QL query backing the panel, if the user wants different underlying data. Omit if unchanged. Use generate_esql/execute_esql to construct and validate it first.'
      ),
  })
  .check((ctx) => {
    if (ctx.value.prompt === undefined && ctx.value.esqlQuery === undefined) {
      ctx.issues.push({
        code: 'custom',
        message: 'Provide at least one of prompt or esqlQuery.',
        input: ctx.value,
      });
    }
  });

export type UpdateAiPanelConfigParams = z.infer<typeof updateAiPanelConfigSchema>;

export function createUpdateAiPanelConfigTool(
  onUpdate: (params: UpdateAiPanelConfigParams) => void
): BrowserApiToolDefinition<UpdateAiPanelConfigParams> {
  return {
    id: 'update_ai_panel_config',
    description: i18n.translate('xpack.aiPanel.agentRefine.updateConfigToolDescription', {
      defaultMessage: 'Updates this dashboard panel — the only way to change what it shows.',
    }),
    schema: updateAiPanelConfigSchema,
    handler: (params) => {
      onUpdate(params);
    },
  };
}
