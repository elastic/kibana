/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useMentionDetection, createResetMentionContext } from './use_mention_detection';

describe('useMentionDetection', () => {
  let mockEditorRef: React.RefObject<HTMLDivElement>;
  let mockEditor: HTMLDivElement;

  beforeEach(() => {
    // Create a mock editor element
    mockEditor = document.createElement('div');
    mockEditor.setAttribute('contenteditable', 'true');
    document.body.appendChild(mockEditor);

    mockEditorRef = { current: mockEditor };
  });

  afterEach(() => {
    document.body.removeChild(mockEditor);
  });

  it('should return initial inactive state', () => {
    const { result } = renderHook(() => useMentionDetection(mockEditorRef));

    expect(result.current.isActive).toBe(false);
    expect(result.current.searchTerm).toBe('');
    expect(result.current.startPosition).toBe(-1);
    expect(result.current.anchorPosition).toBeNull();
  });

  it('should detect @ mention at cursor position', () => {
    const { result } = renderHook(() => useMentionDetection(mockEditorRef));

    // Set editor content
    mockEditor.textContent = '@';

    // Create a selection at the end
    const range = document.createRange();
    range.setStart(mockEditor.firstChild!, 1);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Trigger input event
    act(() => {
      mockEditor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.searchTerm).toBe('');
    expect(result.current.startPosition).toBe(0);
  });

  it('should detect @ mention with search term', () => {
    const { result } = renderHook(() => useMentionDetection(mockEditorRef));

    // Set editor content
    mockEditor.textContent = '@sal';

    // Create a selection at the end
    const range = document.createRange();
    range.setStart(mockEditor.firstChild!, 4);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Trigger input event
    act(() => {
      mockEditor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.searchTerm).toBe('sal');
    expect(result.current.startPosition).toBe(0);
  });

  it('should detect @ mention after text', () => {
    const { result } = renderHook(() => useMentionDetection(mockEditorRef));

    // Set editor content
    mockEditor.textContent = 'Check out @dashboard';

    // Create a selection at the end
    const range = document.createRange();
    range.setStart(mockEditor.firstChild!, 20);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Trigger input event
    act(() => {
      mockEditor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.searchTerm).toBe('dashboard');
    expect(result.current.startPosition).toBe(10); // Position of @
  });

  it('should not detect mention when no @', () => {
    const { result } = renderHook(() => useMentionDetection(mockEditorRef));

    // Set editor content without @
    mockEditor.textContent = 'hello world';

    // Create a selection at the end
    const range = document.createRange();
    range.setStart(mockEditor.firstChild!, 11);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Trigger input event
    act(() => {
      mockEditor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should not detect mention when cursor is not after @', () => {
    const { result } = renderHook(() => useMentionDetection(mockEditorRef));

    // Set editor content
    mockEditor.textContent = 'hello @world';

    // Create a selection at position 3 (not after @)
    const range = document.createRange();
    range.setStart(mockEditor.firstChild!, 3);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Trigger input event
    act(() => {
      mockEditor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(result.current.isActive).toBe(false);
  });
});

describe('createResetMentionContext', () => {
  it('should return an inactive mention context', () => {
    const context = createResetMentionContext();

    expect(context.isActive).toBe(false);
    expect(context.searchTerm).toBe('');
    expect(context.startPosition).toBe(-1);
    expect(context.anchorPosition).toBeNull();
  });
});
