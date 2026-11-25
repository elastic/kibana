/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { ComponentsNode } from '@kbn/isomer-components';
import type { CardAttachmentData } from '../../common/attachments';
import { CARD_ATTACHMENT_TYPE, cardAttachmentDataSchema } from '../../common/attachments';

export const createCardAttachmentType = (): AttachmentTypeDefinition<
  typeof CARD_ATTACHMENT_TYPE,
  CardAttachmentData
> => {
  return {
    id: CARD_ATTACHMENT_TYPE,
    validate: (input) => {
      const parseResult = cardAttachmentDataSchema.safeParse(input);

      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }

      return { valid: false, error: parseResult.error.message };
    },
    format: ({ data: { title, body } }) => ({
      getRepresentation: () => ({
        type: 'text' as const,
        value: `Card${title ? `: ${title}` : ''} (${body.map(({ type }) => type).join(', ')})`,
      }),
    }),
    toSurfaceComposition: ({ data: { title, subtitle, body } }) => ({
      type: 'view',
      ...(title ? { title } : {}),
      ...(subtitle ? { subtitle } : {}),
      body: body as ComponentsNode[],
    }),
    getAgentDescription:
      () => `A card attachment is a message layout you compose for surfaces such as Slack. Use it when a reply reads better as structured parts than as prose, such as key facts, a table of results, a query or a few links. The Kibana chat lists it as an attachment but doesn't draw it.
Its data is { title?, subtitle?, body: [...] }, with 1 to 40 body nodes from:
- { type: "markdown", text }
- { type: "header", text, level?: 1-4 }
- { type: "context", items: [{ text }] }, 1 to 10 small plain-text lines
- { type: "divider" }
- { type: "quote", text }
- { type: "fields", items: [{ label, value }] }, 1 to 10 short facts, such as an app and a time range
- { type: "code", text, language? }, such as an ES|QL query
- { type: "table", columns: [{ label, align? }], rows: [[string | number | null]], maxRows? }, at most 20 columns
- { type: "actions", buttons: [{ label, url | app + path, style?: "primary" | "danger" }] }, 1 to 5 link buttons, with a Kibana app route such as "discover" in \`app\`
There are no click handlers and no charts or images. Put the attachment id in your reply as <render_attachment id="..." /> where the card should appear, with any prose before or after it.`,
    getTools: () => [],
  };
};
