/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ComposerInjection } from '../../../types/composer';
import { useComposerInjectionEffect } from './use_composer_injection_effect';

interface HookParams {
  composerInjection: ComposerInjection | null | undefined;
  messageEditorController: {
    setContent: jest.Mock;
    focus: jest.Mock;
  };
  acknowledgeComposerInjection?: jest.Mock;
}

const renderEffect = (params: HookParams) =>
  renderHook((p: HookParams) => useComposerInjectionEffect(p), { initialProps: params });

describe('useComposerInjectionEffect', () => {
  let setContent: jest.Mock;
  let focus: jest.Mock;
  let acknowledge: jest.Mock;

  beforeEach(() => {
    setContent = jest.fn();
    focus = jest.fn();
    acknowledge = jest.fn();
  });

  it('does nothing when composerInjection is null', () => {
    renderEffect({
      composerInjection: null,
      messageEditorController: { setContent, focus },
      acknowledgeComposerInjection: acknowledge,
    });

    expect(setContent).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it('applies text, focuses, and acknowledges when composerInjection is set', () => {
    renderEffect({
      composerInjection: { key: 1, text: 'hello' },
      messageEditorController: { setContent, focus },
      acknowledgeComposerInjection: acknowledge,
    });

    expect(setContent).toHaveBeenCalledTimes(1);
    expect(setContent).toHaveBeenCalledWith('hello');
    expect(focus).toHaveBeenCalledTimes(1);
    expect(acknowledge).toHaveBeenCalledTimes(1);
  });

  it('re-runs when key changes even if text is identical', () => {
    const controller = { setContent, focus };

    const { rerender } = renderEffect({
      composerInjection: { key: 1, text: 'same' },
      messageEditorController: controller,
      acknowledgeComposerInjection: acknowledge,
    });
    expect(setContent).toHaveBeenCalledTimes(1);

    rerender({
      composerInjection: { key: 2, text: 'same' },
      messageEditorController: controller,
      acknowledgeComposerInjection: acknowledge,
    });

    expect(setContent).toHaveBeenCalledTimes(2);
    expect(setContent).toHaveBeenLastCalledWith('same');
    expect(acknowledge).toHaveBeenCalledTimes(2);
  });

  it('tolerates a missing acknowledge callback', () => {
    expect(() => {
      renderEffect({
        composerInjection: { key: 1, text: 'hello' },
        messageEditorController: { setContent, focus },
        acknowledgeComposerInjection: undefined,
      });
    }).not.toThrow();

    expect(setContent).toHaveBeenCalledWith('hello');
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
