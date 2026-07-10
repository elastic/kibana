/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  AI_PANEL_CONTEXT_ATTACHMENT_TYPE,
  aiPanelContextAttachmentDataSchema,
  type AiPanelContextAttachmentData,
} from '../../common/panel_context_attachment';

/**
 * Creates the definition for the `platform.ai_panel.panel_context` attachment type — a by-value
 * snapshot of the single AI panel currently being refined in chat (its prompt and ES|QL query).
 */
export const createAiPanelContextAttachmentType = (): AttachmentTypeDefinition<
  typeof AI_PANEL_CONTEXT_ATTACHMENT_TYPE,
  AiPanelContextAttachmentData
> => {
  return {
    id: AI_PANEL_CONTEXT_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = aiPanelContextAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatAiPanelContext(attachment.data) };
        },
      };
    },
    isReadonly: true,
    getAgentDescription: () =>
      'Represents the single AI-generated dashboard panel the user is currently refining in ' +
      'chat — it is already visible on their screen right now. To apply ANY change the user ' +
      'asks for, call update_ai_panel_config. Do not call load_skill, ai-panel-authoring, or ' +
      'any dashboard/panel-generation tool for this — those create a separate, unrelated ' +
      'preview and will NOT change what the user is looking at.',
    getTools: () => [],
  };
};

const formatAiPanelContext = (data: AiPanelContextAttachmentData): string =>
  `Panel instructions: ${data.panel_instructions}\n` +
  `ES|QL query: ${data.esql_query || '(none — static panel)'}`;
