/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useInputDraft } from './use_input_draft';

const renderDraft = () =>
  renderHook(() =>
    useInputDraft({
      spaceId: 'default',
      sessionTag: undefined,
      username: 'petr',
      agentId: 'agent-1',
      conversationId: 'conv-1',
    })
  );

describe('useInputDraft', () => {
  beforeEach(() => sessionStorage.clear());

  it('saves the text as is', () => {
    const { result } = renderDraft();

    result.current.saveDraft('hello');

    expect(renderDraft().result.current.draft).toBe('hello');
  });

  it('strips image and pdf chips from the saved draft', () => {
    const { result } = renderDraft();

    result.current.saveDraft('see [a.png](image://a.png) and [b.pdf](pdf://b.pdf) please');

    expect(renderDraft().result.current.draft).toBe('see  and  please');
  });

  it('keeps other links', () => {
    const { result } = renderDraft();

    result.current.saveDraft('[/Summarize](skill://skill-1) [b.pdf](pdf://b.pdf)');

    expect(renderDraft().result.current.draft).toBe('[/Summarize](skill://skill-1) ');
  });

  it('removes the draft when only a pdf chip is left', () => {
    const { result } = renderDraft();
    result.current.saveDraft('text');

    result.current.saveDraft('[b.pdf](pdf://b.pdf)');

    expect(renderDraft().result.current.draft).toBeNull();
  });
});
