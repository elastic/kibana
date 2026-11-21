/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * Creates a panel from a visualization attachment, or a dashboard panel pointer, the conversation
 * already holds. It is not a panel kind: the attachment decides which embeddable it becomes.
 */
export const attachmentPanelInputSchema = lazySchema(() =>
  z.object({
    type: z
      .literal('attachment')
      .describe(
        'Place a visualization that create_visualization already returned, or copy the panel a dashboard panel pointer names.'
      ),
    attachment_id: z
      .string()
      .max(256)
      .describe(
        "ID of a visualization attachment in this conversation (as returned by create_visualization), or of a dashboard panel pointer attachment (platform.dashboard.panel) to copy the panel it names. The panel is built from the attachment's latest version: a visualization's kind (Lens, Vega or custom content) determines the panel type; a pointer copies the existing panel's type and config verbatim."
      ),
  })
);

export type AttachmentPanelInput = z.infer<typeof attachmentPanelInputSchema>;
