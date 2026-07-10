/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const AI_PANEL_CONTEXT_ATTACHMENT_TYPE = 'platform.ai_panel.panel_context';

export const aiPanelContextAttachmentDataSchema = z.object({
  panel_instructions: z.string(),
  esql_query: z.string(),
});

export type AiPanelContextAttachmentData = z.infer<typeof aiPanelContextAttachmentDataSchema>;
