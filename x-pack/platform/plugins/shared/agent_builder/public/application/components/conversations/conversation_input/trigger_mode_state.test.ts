/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatTriggerMode } from '../../../../../common/http_api/chat';
import {
  INITIAL_TRIGGER_MODE_STATE,
  getTriggerMode,
  triggerModeReducer,
} from './trigger_mode_state';
import type { TriggerModeAction, TriggerModeState } from './trigger_mode_state';

const { Always, Never } = ChatTriggerMode;
const CONV = 'conv-1';

const userMention = { id: 'u_julian_0', kind: 'user' as const };
const agentMention = { id: 'my-agent', kind: 'agent' as const };

const run = (...actions: TriggerModeAction[]): TriggerModeState =>
  actions.reduce(triggerModeReducer, INITIAL_TRIGGER_MODE_STATE);

const modeOf = (state: TriggerModeState, conversationId = CONV) =>
  getTriggerMode(state, { conversationId, isSelectable: true });

const typed = (leadingMention?: typeof userMention | typeof agentMention): TriggerModeAction => ({
  type: 'contentChanged',
  conversationId: CONV,
  canMention: true,
  leadingMention,
});
const flip = (mode: ChatTriggerMode): TriggerModeAction => ({
  type: 'manualChange',
  conversationId: CONV,
  mode,
});
const sent = (mode: ChatTriggerMode): TriggerModeAction => ({
  type: 'sent',
  conversationId: CONV,
  mode,
});

describe('trigger mode state', () => {
  it('starts with the agent included', () => {
    expect(modeOf(INITIAL_TRIGGER_MODE_STATE)).toBe(Always);
  });

  describe('a mention at the start', () => {
    it('switches to Post to team for a user', () => {
      expect(modeOf(run(typed(userMention)))).toBe(Never);
    });

    it('switches to Ask agent for the agent, also when the user had picked Post to team', () => {
      expect(modeOf(run(flip(Never), sent(Never), typed(agentMention)))).toBe(Always);
    });

    it('goes back to the earlier mode once the message stops starting with a mention', () => {
      expect(modeOf(run(typed(userMention), typed(undefined)))).toBe(Always);
      expect(modeOf(run(flip(Never), sent(Never), typed(agentMention), typed(undefined)))).toBe(
        Never
      );
    });

    it('follows the first mention when it changes', () => {
      expect(modeOf(run(typed(userMention), typed(agentMention)))).toBe(Always);
      expect(modeOf(run(typed(agentMention), typed(userMention)))).toBe(Never);
    });

    it('returns the same state when nothing changes', () => {
      const state = run(typed(userMention));

      expect(triggerModeReducer(state, typed(userMention))).toBe(state);
    });
  });

  describe('flipping the toggle by hand', () => {
    it('stops mentions from switching it, for this message', () => {
      const state = run(typed(userMention), flip(Always), typed(undefined), typed(userMention));

      expect(modeOf(state)).toBe(Always);
      expect(state.isManualOverride).toBe(true);
    });

    it('also locks when the input is empty', () => {
      expect(modeOf(run(flip(Always), typed(userMention)))).toBe(Always);
      expect(modeOf(run(flip(Never), typed(agentMention)))).toBe(Never);
    });

    it('drops the automatic switch', () => {
      expect(run(typed(userMention), flip(Always)).auto).toBeUndefined();
    });
  });

  describe('sending', () => {
    it('keeps the mode the message was sent with', () => {
      expect(modeOf(run(typed(userMention), sent(Never)))).toBe(Never);
      expect(modeOf(run(flip(Never), sent(Never)))).toBe(Never);
    });

    it('lets mentions switch the toggle again for the next message', () => {
      const state = run(flip(Never), sent(Never), typed(agentMention));

      expect(state.isManualOverride).toBe(false);
      expect(modeOf(state)).toBe(Always);
    });

    it('keeps the automatic switch from sticking: it goes back to the kept mode', () => {
      expect(modeOf(run(typed(userMention), sent(Never), typed(undefined)))).toBe(Never);
    });
  });

  describe('clearing the message without sending it', () => {
    it('drops the automatic switch and the manual lock, and keeps the chosen mode', () => {
      const state = run(flip(Never), { type: 'cleared' });

      expect(state.isManualOverride).toBe(false);
      expect(modeOf(state)).toBe(Never);
      expect(modeOf(run(typed(userMention), { type: 'cleared' }))).toBe(Always);
    });
  });

  describe('conversations', () => {
    it('applies a choice only to the conversation it was made in', () => {
      const state = run(flip(Never));

      expect(modeOf(state, CONV)).toBe(Never);
      expect(modeOf(state, 'conv-2')).toBe(Always);
      expect(getTriggerMode(state, { conversationId: undefined, isSelectable: true })).toBe(Always);
    });

    it('starts fresh in another conversation', () => {
      const state = triggerModeReducer(run(flip(Never)), {
        type: 'contentChanged',
        conversationId: 'conv-2',
        canMention: true,
        leadingMention: undefined,
      });

      expect(state.conversationId).toBe('conv-2');
      expect(modeOf(state, 'conv-2')).toBe(Always);
    });

    it('does not carry a manual lock to another conversation', () => {
      const state = triggerModeReducer(run(flip(Never)), {
        type: 'contentChanged',
        conversationId: 'conv-2',
        canMention: true,
        leadingMention: userMention,
      });

      expect(modeOf(state, 'conv-2')).toBe(Never);
    });
  });

  it('always includes the agent when the toggle is not offered', () => {
    const state = run(flip(Never));

    expect(getTriggerMode(state, { conversationId: CONV, isSelectable: false })).toBe(Always);
  });

  it('can be reset', () => {
    expect(triggerModeReducer(run(flip(Never)), { type: 'reset' })).toBe(
      INITIAL_TRIGGER_MODE_STATE
    );
  });

  describe('when mentions are not allowed (flag off, chat not shared)', () => {
    it('ignores the message content', () => {
      const state = triggerModeReducer(INITIAL_TRIGGER_MODE_STATE, {
        type: 'contentChanged',
        conversationId: CONV,
        canMention: false,
        leadingMention: userMention,
      });

      expect(state).toBe(INITIAL_TRIGGER_MODE_STATE);
    });

    it('still lets the user flip the toggle by hand', () => {
      expect(modeOf(run(flip(Never)))).toBe(Never);
    });
  });
});
