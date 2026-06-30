/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { useMemo } from 'react';
import { useConversationContext } from '../context/conversation/conversation_context';
import { getMergedCartAttachments } from './get_merged_cart_attachments';
import { useConversation } from './use_conversation';

/**
 * Active conversation attachments for cart display — visible cart cards only,
 * aligned with the attachment cart badge count.
 */
export const useActiveConversationAttachments = (): UnknownAttachment[] => {
  const { attachments: pendingAttachments } = useConversationContext();
  const { conversation } = useConversation();

  return useMemo(
    () => getMergedCartAttachments(conversation?.attachments, pendingAttachments),
    [conversation?.attachments, pendingAttachments]
  );
};
