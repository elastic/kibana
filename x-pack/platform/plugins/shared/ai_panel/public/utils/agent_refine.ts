/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { AI_PANEL_MAX_PROMPT_LENGTH, AI_PANEL_MAX_ESQL_QUERY_LENGTH } from '../../common/constants';

export const AI_PANEL_REFINE_SESSION_TAG = 'ai_panel';

export function buildAiPanelContextAttachment(
  prompt: string,
  esqlQuery: string | undefined
): AttachmentInput {
  return {
    hidden: true,
    type: AttachmentType.screenContext,
    data: {
      app: AI_PANEL_REFINE_SESSION_TAG,
      description: i18n.translate('xpack.aiPanel.agentRefine.screenContextDescription', {
        defaultMessage:
          'The user is refining one specific AI-generated dashboard panel that is already ' +
          'visible on their screen right now. To apply ANY change the user asks for, call ' +
          'update_ai_panel_config. Do not call load_skill, ai-panel-authoring, or any ' +
          'dashboard/panel-generation tool for this — those create a separate, unrelated ' +
          'preview and will NOT change what the user is looking at.',
      }),
      additional_data: {
        panel_instructions: prompt,
        esql_query: esqlQuery ?? '',
      },
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
        'The updated panel instructions, if the user wants to change what the panel shows or how it looks. Omit if unchanged.'
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
