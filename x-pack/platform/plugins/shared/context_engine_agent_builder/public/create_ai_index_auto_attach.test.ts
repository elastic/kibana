/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ActiveConversation } from '@kbn/agent-builder-browser';
import type { GetAiIndexResponse } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/public/types';
import { BehaviorSubject } from 'rxjs';
import { AI_INDEX_ATTACHMENT_TYPE } from '../common/agent_builder_attachments';
import { createAiIndexAutoAttach } from './create_ai_index_auto_attach';

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  description: 'Support tickets',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const otherAiIndex: GetAiIndexResponse = { ...aiIndex, id: 'other-ai-index' };

describe('createAiIndexAutoAttach', () => {
  const setup = () => {
    const viewedAiIndex$ = new BehaviorSubject<GetAiIndexResponse | undefined>(undefined);
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    const addAttachment = jest.fn();
    const removeAttachment = jest.fn();

    const agentBuilder = {
      addAttachment,
      removeAttachment,
      events: { ui: { activeConversation$ } },
    } as unknown as AgentBuilderPluginStart;

    const contextEngine = {
      viewedAiIndex$: viewedAiIndex$.asObservable(),
    } as unknown as ContextEnginePluginStart;

    const stop = createAiIndexAutoAttach({ agentBuilder, contextEngine });

    return { viewedAiIndex$, activeConversation$, addAttachment, removeAttachment, stop };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('attaches the viewed AI index once a conversation is open', () => {
    const { viewedAiIndex$, activeConversation$, addAttachment } = setup();

    activeConversation$.next({ id: 'conversation-1' });
    viewedAiIndex$.next(aiIndex);
    jest.runAllTimers();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'my-ai-index',
        type: AI_INDEX_ATTACHMENT_TYPE,
        data: expect.objectContaining({ id: 'my-ai-index' }),
      })
    );
  });

  it('attaches when the user opens the assistant while already on the page', () => {
    const { viewedAiIndex$, activeConversation$, addAttachment } = setup();

    viewedAiIndex$.next(aiIndex);
    jest.runAllTimers();
    expect(addAttachment).not.toHaveBeenCalled();

    activeConversation$.next({ id: 'conversation-1' });
    jest.runAllTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('does not attach while no chat surface is mounted', () => {
    const { viewedAiIndex$, addAttachment } = setup();

    viewedAiIndex$.next(aiIndex);
    jest.runAllTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('withdraws the attachment when the user leaves the page', () => {
    const { viewedAiIndex$, activeConversation$, removeAttachment } = setup();

    activeConversation$.next({ id: 'conversation-1' });
    viewedAiIndex$.next(aiIndex);
    jest.runAllTimers();

    viewedAiIndex$.next(undefined);
    jest.runAllTimers();

    expect(removeAttachment).toHaveBeenCalledWith('my-ai-index');
  });

  it('swaps the attachment when the user moves to another AI index', () => {
    const { viewedAiIndex$, activeConversation$, addAttachment, removeAttachment } = setup();

    activeConversation$.next({ id: 'conversation-1' });
    viewedAiIndex$.next(aiIndex);
    jest.runAllTimers();

    viewedAiIndex$.next(otherAiIndex);
    jest.runAllTimers();

    expect(removeAttachment).toHaveBeenCalledWith('my-ai-index');
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'other-ai-index' })
    );
  });

  it('stops attaching once torn down', () => {
    const { viewedAiIndex$, activeConversation$, addAttachment, stop } = setup();

    stop();
    activeConversation$.next({ id: 'conversation-1' });
    viewedAiIndex$.next(aiIndex);
    jest.runAllTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('is inert when Agent Builder is unavailable', () => {
    const contextEngine = {
      viewedAiIndex$: new BehaviorSubject<GetAiIndexResponse | undefined>(aiIndex).asObservable(),
    } as unknown as ContextEnginePluginStart;

    expect(() =>
      createAiIndexAutoAttach({ agentBuilder: undefined, contextEngine })()
    ).not.toThrow();
  });
});
