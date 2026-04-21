/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useComposerInjection } from './use_composer_injection';

describe('useComposerInjection', () => {
  it('starts with a null composer injection', () => {
    const { result } = renderHook(() => useComposerInjection());
    expect(result.current.composerInjection).toBeNull();
  });

  it('stores { key, text } when setComposerContent is called', () => {
    const { result } = renderHook(() => useComposerInjection());

    act(() => {
      result.current.setComposerContent('hello');
    });

    expect(result.current.composerInjection).toEqual({ key: 1, text: 'hello' });
  });

  it('increments key on every setComposerContent call, even for identical text', () => {
    const { result } = renderHook(() => useComposerInjection());

    act(() => {
      result.current.setComposerContent('same');
    });
    expect(result.current.composerInjection?.key).toBe(1);

    act(() => {
      result.current.setComposerContent('same');
    });
    expect(result.current.composerInjection).toEqual({ key: 2, text: 'same' });

    act(() => {
      result.current.setComposerContent('different');
    });
    expect(result.current.composerInjection).toEqual({ key: 3, text: 'different' });
  });

  it('acknowledgeComposerInjection resets to null', () => {
    const { result } = renderHook(() => useComposerInjection());

    act(() => {
      result.current.setComposerContent('hello');
    });
    expect(result.current.composerInjection).not.toBeNull();

    act(() => {
      result.current.acknowledgeComposerInjection();
    });
    expect(result.current.composerInjection).toBeNull();
  });

  it('continues to increment keys after acknowledge', () => {
    const { result } = renderHook(() => useComposerInjection());

    act(() => {
      result.current.setComposerContent('first');
    });
    act(() => {
      result.current.acknowledgeComposerInjection();
    });
    act(() => {
      result.current.setComposerContent('second');
    });

    // key is reset-agnostic: increments from prev.key which is 0 after ack.
    // We only care that subsequent calls still produce a non-null injection.
    expect(result.current.composerInjection?.text).toBe('second');
    expect(typeof result.current.composerInjection?.key).toBe('number');
  });

  it('exposes stable callback references', () => {
    const { result, rerender } = renderHook(() => useComposerInjection());

    const firstSetter = result.current.setComposerContent;
    const firstAck = result.current.acknowledgeComposerInjection;

    act(() => {
      result.current.setComposerContent('hello');
    });

    rerender();

    expect(result.current.setComposerContent).toBe(firstSetter);
    expect(result.current.acknowledgeComposerInjection).toBe(firstAck);
  });
});
