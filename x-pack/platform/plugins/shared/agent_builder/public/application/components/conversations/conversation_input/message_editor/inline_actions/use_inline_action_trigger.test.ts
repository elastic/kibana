/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useInlineActionTrigger } from './use_inline_action_trigger';
import * as triggerMatcherModule from './trigger_matcher';

jest.mock('./trigger_matcher', () => {
  const actual = jest.requireActual('./trigger_matcher');
  const { TriggerId } = jest.requireActual('./types');
  return {
    ...actual,
    getTextBeforeCursor: jest.fn(),
    matchTrigger: actual.createMatchTrigger([
      { id: TriggerId.Attachment, sequence: '@' },
      { id: TriggerId.Prompt, sequence: '/p' },
    ]),
  };
});

const mockGetTextBeforeCursor = triggerMatcherModule.getTextBeforeCursor as jest.MockedFunction<
  typeof triggerMatcherModule.getTextBeforeCursor
>;

const mockElement = document.createElement('div');

describe('useInlineActionTrigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns inactive match initially', () => {
    const { result } = renderHook(() => useInlineActionTrigger());

    expect(result.current.match.isActive).toBe(false);
    expect(result.current.match.activeTrigger).toBeNull();
  });

  it('detects trigger on handleInput', () => {
    mockGetTextBeforeCursor.mockReturnValue('@');

    const { result } = renderHook(() => useInlineActionTrigger());

    act(() => {
      result.current.handleInput(mockElement);
    });

    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeTrigger?.trigger.id).toBe('attachment');
    expect(result.current.match.activeTrigger?.query).toBe('');
  });

  it('updates query as user types after trigger', () => {
    mockGetTextBeforeCursor.mockReturnValue('@joh');

    const { result } = renderHook(() => useInlineActionTrigger());

    act(() => {
      result.current.handleInput(mockElement);
    });

    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeTrigger?.query).toBe('joh');
  });

  it('keeps trigger active when query contains whitespace', () => {
    const { result } = renderHook(() => useInlineActionTrigger());

    mockGetTextBeforeCursor.mockReturnValue('@john');
    act(() => {
      result.current.handleInput(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);

    mockGetTextBeforeCursor.mockReturnValue('@john ');
    act(() => {
      result.current.handleInput(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeTrigger?.query).toBe('john ');
  });

  it('dismiss() deactivates the current trigger', () => {
    mockGetTextBeforeCursor.mockReturnValue('@john');

    const { result } = renderHook(() => useInlineActionTrigger());

    act(() => {
      result.current.handleInput(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.match.isActive).toBe(false);
  });

  it('dismissed trigger re-activates on next input', () => {
    const { result } = renderHook(() => useInlineActionTrigger());

    mockGetTextBeforeCursor.mockReturnValue('@john');
    act(() => {
      result.current.handleInput(mockElement);
    });

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.match.isActive).toBe(false);

    // User continues typing — trigger re-activates
    mockGetTextBeforeCursor.mockReturnValue('@johnny');
    act(() => {
      result.current.handleInput(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeTrigger?.query).toBe('johnny');
  });

  it('disabled option prevents trigger detection', () => {
    mockGetTextBeforeCursor.mockReturnValue('@john');

    const { result } = renderHook(() => useInlineActionTrigger({ enabled: false }));

    act(() => {
      result.current.handleInput(mockElement);
    });
    expect(result.current.match.isActive).toBe(false);
  });
});
