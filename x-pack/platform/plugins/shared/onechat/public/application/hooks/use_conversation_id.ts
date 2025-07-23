/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { newConversationId } from '../utils/new_conversation';

export const useConversationId = () => {
  const { conversationId: conversationIdParam } = useParams<{ conversationId?: string }>();

  // TODO: Add logic to resume most recent conversation when no conversationId is provided
  // For now, if no conversationId is provided, we will create a new conversation
  const conversationId = useMemo(() => {
    return conversationIdParam === newConversationId ? undefined : conversationIdParam;
  }, [conversationIdParam]);

  return conversationId;
};
