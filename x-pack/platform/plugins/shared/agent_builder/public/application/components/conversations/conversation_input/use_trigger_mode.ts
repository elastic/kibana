/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer, useRef } from 'react';
import type { ChatTriggerMode } from '../../../../../common/http_api/chat';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useIsSharedConversation } from '../../../hooks/use_conversation';
import type { LeadingMention } from './mentions/get_leading_mention';
import {
  INITIAL_TRIGGER_MODE_STATE,
  getTriggerMode,
  triggerModeReducer,
} from './trigger_mode_state';

/** State of the "Ask agent / Skip agent" toggle. A leading mention can switch it. */
export const useTriggerMode = ({ canMention }: { canMention: boolean }) => {
  const conversationId = useConversationId();
  const isSelectable = useIsSharedConversation();

  const [state, dispatch] = useReducer(triggerModeReducer, INITIAL_TRIGGER_MODE_STATE);

  if (!isSelectable && state !== INITIAL_TRIGGER_MODE_STATE) {
    dispatch({ type: 'reset' });
  }

  const triggerMode = getTriggerMode(state, { conversationId, isSelectable });

  // Long-lived handlers call the callbacks below, so they read the latest values from a ref
  const latest = useRef({ conversationId, canMention, triggerMode });
  latest.current = { conversationId, canMention, triggerMode };

  const setTriggerMode = useCallback((mode: ChatTriggerMode) => {
    dispatch({ type: 'manualChange', conversationId: latest.current.conversationId, mode });
  }, []);

  const updateLeadingMention = useCallback((leadingMention?: LeadingMention) => {
    const { conversationId: id, canMention: canMentionNow } = latest.current;
    dispatch({
      type: 'contentChanged',
      conversationId: id,
      canMention: canMentionNow,
      leadingMention,
    });
  }, []);

  const markSent = useCallback(() => {
    const { conversationId: id, triggerMode: mode } = latest.current;
    dispatch({ type: 'sent', conversationId: id, mode });
  }, []);

  const markCleared = useCallback(() => dispatch({ type: 'cleared' }), []);

  return {
    triggerMode,
    isSelectable,
    setTriggerMode,
    updateLeadingMention,
    markSent,
    markCleared,
  };
};
