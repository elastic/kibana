/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';

/**
 * The third panel input `source`, alongside `config` (by value) and `request`
 * (resolved from a query): add a panel from a visualization attachment the
 * conversation already holds.
 *
 * Unlike the other two this is orthogonal to panel `type` — the attachment's own
 * renderer decides which embeddable the panel becomes, so the caller supplies
 * only an id and a grid. The store read happens in the injected
 * `resolveAttachmentPanel` seam, keeping the generate core store-free.
 *
 * It exists because the by-value path forces the model to copy a whole payload
 * from a tool result into a tool call. That is merely wasteful for a Lens config
 * and actively bad for a custom content template, which can run to several KB of
 * HTML the model would have to reproduce verbatim.
 */
export const attachmentPanelInputSchema = z.object({
  source: z.literal('attachment'),
  attachment_id: z
    .string()
    .max(256)
    .describe(
      'ID of a visualization attachment in this conversation, as returned by create_visualization. The panel is built from the attachment\'s latest version, so its renderer (Lens, Vega or custom content) determines the panel type. Prefer this over source: "config" whenever you have an attachment id — it avoids copying the visualization payload through the conversation.'
    ),
  grid: panelGridSchema,
});

export type AttachmentPanelInput = z.infer<typeof attachmentPanelInputSchema>;
