/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationAttachment,
  UnknownAttachment,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { getActiveAttachments } from '@kbn/agent-builder-common/attachments';
import { mapAttachmentsForCart } from '../components/conversations/conversation_rounds/round_response/attachments/to_unknown_attachment_for_cart';
import { upsertAttachmentsIntoList } from '../context/conversation/upsert_attachments_into_list';

export const getMergedCartAttachments = (
  conversationAttachments: VersionedAttachment[] | undefined,
  pendingAttachments: ConversationAttachment[] | undefined
): UnknownAttachment[] => {
  const activePersisted = getActiveAttachments(conversationAttachments ?? []);
  const merged = upsertAttachmentsIntoList(activePersisted, pendingAttachments ?? []);
  return mapAttachmentsForCart(merged);
};
