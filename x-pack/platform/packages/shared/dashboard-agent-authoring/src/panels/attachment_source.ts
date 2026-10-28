/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Creates a panel from a visualization attachment the conversation already holds. Carries no panel
 * `type`: the attachment's own renderer decides which embeddable it becomes.
 */
export const attachmentPanelInputSchema = z.object({
  source: z.literal('attachment'),
  attachment_id: z
    .string()
    .max(256)
    .describe(
      "ID of a visualization attachment in this conversation, as returned by create_visualization. The panel is built from the attachment's latest version, so its renderer (Lens, Vega or custom content) determines the panel type."
    ),
});

export type AttachmentPanelInput = z.infer<typeof attachmentPanelInputSchema>;
