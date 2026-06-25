/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useConversationContext } from '../context/conversation/conversation_context';
import { upsertAttachmentsIntoList } from '../context/conversation/upsert_attachments_into_list';
import { useConversation } from './use_conversation';

export const useActiveConversationAttachmentCount = (): number => {
  const { attachments: pendingAttachments } = useConversationContext();
  const { conversation } = useConversation();

  return useMemo(() => {
    const merged = upsertAttachmentsIntoList(conversation?.attachments, pendingAttachments ?? []);
    return merged.length;
  }, [conversation?.attachments, pendingAttachments]);
};
