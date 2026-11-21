/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCarryOverDraft, useInputDraft } from './use_input_draft';

const params = {
  spaceId: 'default',
  sessionTag: 'tag',
  username: 'elastic',
  agentId: 'agent-1',
};

describe('useCarryOverDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  const renderNewChatInput = () =>
    renderHook(() => useInputDraft({ ...params, conversationId: undefined })).result;
  const renderConversationInput = (conversationId: string) =>
    renderHook(() => useInputDraft({ ...params, conversationId })).result;

  it('takes the draft of the new chat and removes it', () => {
    renderNewChatInput().current.saveDraft('typed text');
    const { result } = renderHook(() => useCarryOverDraft(params));

    expect(result.current.takeNewChatDraft()).toBe('typed text');
    expect(renderNewChatInput().current.draft).toBeNull();
  });

  it('reads the draft when it is called, not when the component rendered', () => {
    const { result } = renderHook(() => useCarryOverDraft(params));
    renderNewChatInput().current.saveDraft('typed after render');

    expect(result.current.takeNewChatDraft()).toBe('typed after render');
  });

  it('returns null when nothing was typed', () => {
    const { result } = renderHook(() => useCarryOverDraft(params));

    expect(result.current.takeNewChatDraft()).toBeNull();
  });

  it('stores a draft that the input of that conversation reads', () => {
    const { result } = renderHook(() => useCarryOverDraft(params));

    result.current.saveDraftTo('conv-1', 'carried over');

    expect(renderConversationInput('conv-1').current.draft).toBe('carried over');
    expect(renderConversationInput('conv-2').current.draft).toBeNull();
  });

  it('does not store a blank draft', () => {
    const { result } = renderHook(() => useCarryOverDraft(params));

    result.current.saveDraftTo('conv-1', '   ');

    expect(renderConversationInput('conv-1').current.draft).toBeNull();
  });

  it('does nothing without a user', () => {
    const { result } = renderHook(() => useCarryOverDraft({ ...params, username: undefined }));

    result.current.saveDraftTo('conv-1', 'typed text');

    expect(result.current.takeNewChatDraft()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});
