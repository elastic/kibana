/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatEventType } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AiIndexConversationState } from '@kbn/context-engine-plugin/public/types';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  CONVERSATION_IDLE_AFTER_MS,
  createAiIndexConversationTracker,
} from './ai_index_conversations';

const createHarness = () => {
  const activeConversation$ = new BehaviorSubject<{ id?: string } | null>(null);
  const chatEvents$ = new Subject<{ type: ChatEventType; data: Record<string, unknown> }>();
  const store = new Map<string, string>();

  const agentBuilder = {
    events: {
      ui: { activeConversation$ },
      getChatEvents$: jest.fn().mockReturnValue(chatEvents$),
    },
  } as unknown as AgentBuilderPluginStart;

  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  };

  const tracker = createAiIndexConversationTracker({ agentBuilder, storage });

  const observe = (aiIndexId: string) => {
    const seen: AiIndexConversationState[] = [];
    tracker.state$(aiIndexId).subscribe((state) => seen.push(state));
    return {
      get latest() {
        return seen[seen.length - 1];
      },
    };
  };

  return { tracker, activeConversation$, chatEvents$, store, observe };
};

const roundComplete = { type: ChatEventType.roundComplete, data: { round: {} } };
const working = { type: ChatEventType.messageChunk, data: { text_chunk: 'thinking' } };

describe('createAiIndexConversationTracker', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reports nothing for an index whose page has not opened the assistant', () => {
    const { observe } = createHarness();

    expect(observe('my-index').latest).toEqual({ isRunning: false });
  });

  it('binds the conversation the sidebar settles on to the index that asked for it', () => {
    const { tracker, activeConversation$, observe } = createHarness();
    const state = observe('my-index');

    tracker.bindNextConversation('my-index');
    activeConversation$.next({ id: 'conv-1' });

    expect(state.latest).toEqual({ conversationId: 'conv-1', isRunning: false });
  });

  it('ignores conversations the user opened for themselves', () => {
    const { activeConversation$, observe } = createHarness();
    const state = observe('my-index');

    activeConversation$.next({ id: 'conv-unrelated' });

    expect(state.latest).toEqual({ isRunning: false });
  });

  it('binds only the first conversation after a request, not every later one', () => {
    const { tracker, activeConversation$, observe } = createHarness();
    const state = observe('my-index');

    tracker.bindNextConversation('my-index');
    activeConversation$.next({ id: 'conv-1' });
    activeConversation$.next({ id: 'conv-2' });

    expect(state.latest.conversationId).toBe('conv-1');
  });

  it('reports the agent as working while its conversation produces events', () => {
    const { tracker, activeConversation$, chatEvents$, observe } = createHarness();
    const state = observe('my-index');

    tracker.bindNextConversation('my-index');
    activeConversation$.next({ id: 'conv-1' });
    chatEvents$.next(working);

    expect(state.latest).toEqual({ conversationId: 'conv-1', isRunning: true });
  });

  it('stops reporting work when the round completes', () => {
    const { tracker, activeConversation$, chatEvents$, observe } = createHarness();
    const state = observe('my-index');

    tracker.bindNextConversation('my-index');
    activeConversation$.next({ id: 'conv-1' });
    chatEvents$.next(working);
    chatEvents$.next(roundComplete);

    expect(state.latest).toEqual({ conversationId: 'conv-1', isRunning: false });
  });

  it('stops reporting work once the events dry up, so closing the sidebar does not strand it', () => {
    const { tracker, activeConversation$, chatEvents$, observe } = createHarness();
    const state = observe('my-index');

    tracker.bindNextConversation('my-index');
    activeConversation$.next({ id: 'conv-1' });
    chatEvents$.next(working);
    activeConversation$.next(null);

    expect(state.latest.isRunning) /* still working as far as we saw */
      .toBe(true);

    jest.advanceTimersByTime(CONVERSATION_IDLE_AFTER_MS);

    expect(state.latest.isRunning).toBe(false);
  });

  it('keeps reporting work while events keep arriving', () => {
    const { tracker, activeConversation$, chatEvents$, observe } = createHarness();
    const state = observe('my-index');

    tracker.bindNextConversation('my-index');
    activeConversation$.next({ id: 'conv-1' });
    chatEvents$.next(working);

    jest.advanceTimersByTime(CONVERSATION_IDLE_AFTER_MS - 1);
    chatEvents$.next(working);
    jest.advanceTimersByTime(CONVERSATION_IDLE_AFTER_MS - 1);

    expect(state.latest.isRunning).toBe(true);
  });

  it('does not attribute one index\u2019s events to another', () => {
    const { tracker, activeConversation$, chatEvents$, observe } = createHarness();
    const other = observe('other-index');

    tracker.bindNextConversation('my-index');
    activeConversation$.next({ id: 'conv-1' });
    chatEvents$.next(working);

    expect(other.latest).toEqual({ isRunning: false });
  });

  it('remembers the conversation across a reload but never claims it is still running', () => {
    const { tracker, activeConversation$, chatEvents$, store } = createHarness();

    tracker.bindNextConversation('my-index');
    activeConversation$.next({ id: 'conv-1' });
    chatEvents$.next(working);

    const reloaded = createAiIndexConversationTracker({
      agentBuilder: undefined,
      storage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });

    const seen: AiIndexConversationState[] = [];
    reloaded.state$('my-index').subscribe((state) => seen.push(state));

    expect(seen[0]).toEqual({ conversationId: 'conv-1', isRunning: false });
    expect(reloaded.getConversationId('my-index')).toBe('conv-1');
  });

  it('works without agent builder rather than throwing', () => {
    const tracker = createAiIndexConversationTracker({
      agentBuilder: undefined,
      storage: undefined,
    });

    tracker.bindNextConversation('my-index');

    expect(tracker.getConversationId('my-index')).toBeUndefined();
  });
});
