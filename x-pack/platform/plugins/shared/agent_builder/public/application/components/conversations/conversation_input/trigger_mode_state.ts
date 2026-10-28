/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatTriggerMode } from '../../../../../common/http_api/chat';
import type { LeadingMention } from './mentions/get_leading_mention';

export interface TriggerModeState {
  /** The chat this state belongs to. The input stays mounted across chats. */
  conversationId?: string;
  /** Picked by hand, or kept after a send. */
  selected: ChatTriggerMode;
  /** Set by a mention at the start of the message. Wins over `selected` while it is set. */
  auto?: ChatTriggerMode;
  /** The user flipped the toggle by hand in this message, so mentions no longer switch it. */
  isManualOverride: boolean;
}

export const INITIAL_TRIGGER_MODE_STATE: TriggerModeState = {
  selected: ChatTriggerMode.Always,
  isManualOverride: false,
};

export type TriggerModeAction =
  | {
      type: 'contentChanged';
      conversationId?: string;
      canMention: boolean;
      leadingMention?: LeadingMention;
    }
  | { type: 'manualChange'; conversationId?: string; mode: ChatTriggerMode }
  | { type: 'sent'; conversationId?: string; mode: ChatTriggerMode }
  /** The message was dropped without being sent, e.g. by switching chat. */
  | { type: 'cleared' }
  | { type: 'reset' };

const forConversation = (state: TriggerModeState, conversationId?: string): TriggerModeState =>
  state.conversationId === conversationId
    ? state
    : { ...INITIAL_TRIGGER_MODE_STATE, conversationId };

/**
 * A choice only applies to the chat it was made in, and is dropped once the toggle is not offered.
 */
export const getTriggerMode = (
  state: TriggerModeState,
  { conversationId, isSelectable }: { conversationId?: string; isSelectable: boolean }
): ChatTriggerMode =>
  !isSelectable || state.conversationId !== conversationId
    ? ChatTriggerMode.Always
    : state.auto ?? state.selected;

export const triggerModeReducer = (
  state: TriggerModeState,
  action: TriggerModeAction
): TriggerModeState => {
  switch (action.type) {
    case 'contentChanged': {
      if (!action.canMention) {
        return state;
      }
      const current = forConversation(state, action.conversationId);
      if (current.isManualOverride) {
        return current;
      }
      const { leadingMention } = action;
      const auto = leadingMention
        ? leadingMention.kind === 'user'
          ? ChatTriggerMode.Never
          : ChatTriggerMode.Always
        : undefined;
      return current.auto === auto ? current : { ...current, auto };
    }
    case 'manualChange':
      return {
        ...forConversation(state, action.conversationId),
        selected: action.mode,
        auto: undefined,
        isManualOverride: true,
      };
    case 'sent':
      return {
        ...forConversation(state, action.conversationId),
        selected: action.mode,
        auto: undefined,
        isManualOverride: false,
      };
    case 'cleared':
      return state.auto === undefined && !state.isManualOverride
        ? state
        : { ...state, auto: undefined, isManualOverride: false };
    case 'reset':
      return INITIAL_TRIGGER_MODE_STATE;
  }
};
