/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { getActiveAttachments } from '@kbn/agent-builder-common/attachments';
import { useMemo } from 'react';
import { mapAttachmentsForCart } from '../components/conversations/conversation_rounds/round_response/attachments/to_unknown_attachment_for_cart';
import { useConversationContext } from '../context/conversation/conversation_context';
import { upsertAttachmentsIntoList } from '../context/conversation/upsert_attachments_into_list';
import { useConversation } from './use_conversation';

/**
 * Active conversation attachments for cart display — same merge as the cart badge count,
 * mapped to UnknownAttachment for UI definitions (label, icon, subtitle).
 */
export const useActiveConversationAttachments = (): UnknownAttachment[] => {
  const { attachments: pendingAttachments } = useConversationContext();
  const { conversation } = useConversation();

  return useMemo(() => {
    const activePersisted = getActiveAttachments(conversation?.attachments ?? []);
    const merged = upsertAttachmentsIntoList(activePersisted, pendingAttachments ?? []);
    return mapAttachmentsForCart(merged);
  }, [conversation?.attachments, pendingAttachments]);
};
