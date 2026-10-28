/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../hooks/use_conversation';
import { isListedActivityEvent } from './to_activity_items';

/** The open state of the activity log flyout, and whether the conversation has anything to show. */
export const useActivityLog = () => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [conversationId]);

  const hasActivity = useMemo(
    () => Boolean(conversation?.events?.some(isListedActivityEvent)),
    [conversation?.events]
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { hasActivity, isOpen, open, close };
};
