/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { PANEL_PREVIEW_ATTACHMENT_TYPE, type PanelPreviewAttachmentData } from '../../common';

// Previews are small (~100KB); this stays below the 3.5MB the model accepts per image.
const MAX_BASE64_LENGTH = 3 * 1024 * 1024;

const panelPreviewDataSchema = z.object({
  panel_id: z.string().max(256),
  title: z.string().max(1000).optional(),
  mime_type: z.literal('image/png'),
  data: z.string().max(MAX_BASE64_LENGTH),
});

/**
 * Creates the definition for the panel preview attachment type: a PNG of one panel,
 * rendered on the server, that the model sees as an image.
 */
export const createPanelPreviewAttachmentType = (): AttachmentTypeDefinition<
  typeof PANEL_PREVIEW_ATTACHMENT_TYPE,
  PanelPreviewAttachmentData
> => ({
  id: PANEL_PREVIEW_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parseResult = panelPreviewDataSchema.safeParse(input);
    return parseResult.success
      ? { valid: true, data: parseResult.data }
      : { valid: false, error: parseResult.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'image' as const,
      mimeType: attachment.data.mime_type,
      getBase64: async () => attachment.data.data,
    }),
  }),
  getAgentDescription: () =>
    'A PNG preview of one dashboard panel, rendered on the server from the panel config and its data. Call attachment_read(attachment_id) to see it again.',
  getTools: () => [],
});
