/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useCommandMenu } from './use_command_menu';
import { getTextBeforeCursor } from './utils/get_text_before_cursor';

jest.mock('./utils/get_text_before_cursor');
const mockGetTextBeforeCursor = jest.mocked(getTextBeforeCursor);

const mockElement = document.createElement('div');

describe('useCommandMenuCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns inactive match initially', () => {
    const { result } = renderHook(() => useCommandMenu());

    expect(result.current.match.isActive).toBe(false);
    expect(result.current.match.activeCommand).toBeNull();
  });

  it('detects command on handleInput', () => {
    mockGetTextBeforeCursor.mockReturnValue('@');

    const { result } = renderHook(() => useCommandMenu());

    act(() => {
      result.current.checkInputForCommand(mockElement);
    });

    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeCommand?.command.id).toBe('attachment');
    expect(result.current.match.activeCommand?.query).toBe('');
  });

  it('updates query as user types after command', () => {
    mockGetTextBeforeCursor.mockReturnValue('@joh');

    const { result } = renderHook(() => useCommandMenu());

    act(() => {
      result.current.checkInputForCommand(mockElement);
    });

    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeCommand?.query).toBe('joh');
  });

  it('keeps command active when query contains whitespace', () => {
    const { result } = renderHook(() => useCommandMenu());

    mockGetTextBeforeCursor.mockReturnValue('@john');
    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);

    mockGetTextBeforeCursor.mockReturnValue('@john ');
    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeCommand?.query).toBe('john ');
  });

  it('dismiss() deactivates the current command', () => {
    mockGetTextBeforeCursor.mockReturnValue('@john');

    const { result } = renderHook(() => useCommandMenu());

    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.match.isActive).toBe(false);
  });

  it('dismissed command re-activates on next input', () => {
    const { result } = renderHook(() => useCommandMenu());

    mockGetTextBeforeCursor.mockReturnValue('@john');
    act(() => {
      result.current.checkInputForCommand(mockElement);
    });

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.match.isActive).toBe(false);

    // User continues typing — command re-activates
    mockGetTextBeforeCursor.mockReturnValue('@johnny');
    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeCommand?.query).toBe('johnny');
  });

  it('disabled option prevents command detection', () => {
    mockGetTextBeforeCursor.mockReturnValue('@john');

    const { result } = renderHook(() => useCommandMenu({ enabled: false }));

    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(false);
  });
});
