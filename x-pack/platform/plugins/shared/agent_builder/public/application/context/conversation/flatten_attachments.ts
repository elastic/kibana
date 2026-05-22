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
 */
export const flattenAttachments = (attachments: ConversationAttachment[]): AttachmentInput[] =>
  attachments.flatMap((a) => (isAttachmentGroup(a) ? a.items : [a]));
