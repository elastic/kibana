/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatTriggerMode } from '../../../../../common/http_api/chat';
import type { LeadingMention } from './mentions/get_leading_mention';

export interface TriggerModeState {
  conversationId?: string;
  selected: ChatTriggerMode;
  /** Set by a mention at the start of the message. Wins over `selected`. */
  auto?: ChatTriggerMode;
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
  | { type: 'cleared' }
  | { type: 'reset' };

const forConversation = (state: TriggerModeState, conversationId?: string): TriggerModeState =>
  state.conversationId === conversationId
    ? state
    : { ...INITIAL_TRIGGER_MODE_STATE, conversationId };

/** A choice only counts in the chat it was made in, and only while the toggle is shown. */
export const getTriggerMode = (
  state: TriggerModeState,
  { conversationId, isSelectable }: { conversationId?: string; isSelectable: boolean }
): ChatTriggerMode =>
  !isSelectable || state.conversationId !== conversationId
    ? ChatTriggerMode.Always
    : state.auto ?? state.selected;

/**
 * How the agent toggle changes:
 * - Typing: only a mention at the start of the message counts (spaces before it are ignored).
 *   - `@user` → "Skip agent" (`never`)
 *   - `@agent` → "Ask agent" (`always`)
 *   - mention removed → back to `selected`
 *   - a mention later in the message changes nothing
 * - Manual flip: wins over mentions until the message is sent.
 * - Send: the mode used stays for the next message, and mentions switch it again.
 * - Each chat keeps its own choice. Mentions do nothing when `canMention` is off.
 */
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
