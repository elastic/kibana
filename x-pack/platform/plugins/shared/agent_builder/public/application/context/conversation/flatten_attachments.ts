/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentInput,
  ConversationAttachment,
} from '@kbn/agent-builder-common/attachments';
import { isAttachmentGroup } from '@kbn/agent-builder-common/attachments';

/**
 * Flattens ConversationAttachment[] to AttachmentInput[] for serialization.
 * AttachmentGroups are expanded to their constituent items; individual attachments pass through unchanged.
 * This is the only place groups are dissolved — the server always receives AttachmentInput[].
 *
 * Group items are stamped with group_id and description at this boundary:
 *   - group_id is always set to the group's id, overriding any pre-existing value on the item.
 *     An item pre-setting group_id would be a caller error — group identity belongs to the group.
 *   - description falls back to the group's label if the item does not supply its own.
 */
export const flattenAttachments = (attachments: ConversationAttachment[]): AttachmentInput[] =>
  attachments.flatMap((a) =>
    isAttachmentGroup(a)
      ? a.items.map((item) => ({
          ...item,
          group_id: a.id,
          description: item.description ?? a.label,
        }))
      : [a]
  );
