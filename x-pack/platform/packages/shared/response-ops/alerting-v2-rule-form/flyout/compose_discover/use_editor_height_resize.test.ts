/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { INITIAL_EDITOR_HEIGHT, MAX_EDITOR_HEIGHT, MIN_EDITOR_HEIGHT } from './constants';
import { useEditorHeightResize } from './use_editor_height_resize';

describe('useEditorHeightResize', () => {
  it('starts at the initial editor height', () => {
    const { result } = renderHook(() => useEditorHeightResize());
    expect(result.current.editorHeight).toBe(INITIAL_EDITOR_HEIGHT);
  });

  it('grows and shrinks with arrow keys within min/max bounds', () => {
    const { result } = renderHook(() => useEditorHeightResize());

    act(() => {
      result.current.onResizeKeyDown({
        key: 'ArrowDown',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>);
    });
    expect(result.current.editorHeight).toBe(INITIAL_EDITOR_HEIGHT + 16);

    act(() => {
      result.current.onResizeKeyDown({
        key: 'ArrowUp',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>);
    });
    expect(result.current.editorHeight).toBe(INITIAL_EDITOR_HEIGHT);

    for (let i = 0; i < 100; i++) {
      act(() => {
        result.current.onResizeKeyDown({
          key: 'ArrowUp',
          preventDefault: jest.fn(),
        } as unknown as React.KeyboardEvent<HTMLButtonElement>);
      });
    }
    expect(result.current.editorHeight).toBe(MIN_EDITOR_HEIGHT);

    for (let i = 0; i < 100; i++) {
      act(() => {
        result.current.onResizeKeyDown({
          key: 'ArrowDown',
          preventDefault: jest.fn(),
        } as unknown as React.KeyboardEvent<HTMLButtonElement>);
      });
    }
    expect(result.current.editorHeight).toBe(MAX_EDITOR_HEIGHT);
  });
});
