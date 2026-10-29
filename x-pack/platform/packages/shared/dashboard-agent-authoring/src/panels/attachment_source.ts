/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * Creates a panel from a visualization attachment the conversation already holds. Carries no panel
 * `type`: the attachment's own renderer decides which embeddable it becomes.
 */
export const attachmentPanelInputSchema = lazySchema(() =>
  z.object({
    source: z.literal('attachment'),
    attachment_id: z
      .string()
      .max(256)
      .describe(
        "Id of a visualization attachment in this Agent Builder conversation, as returned by create_visualization. The panel takes the attachment's latest version; its renderer (Lens, Vega or custom content) sets the panel kind."
      ),
  })
);

export type AttachmentPanelInput = z.infer<typeof attachmentPanelInputSchema>;
