/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MessageEditor } from './message_editor';
import type { MessageEditorInstance } from './use_message_editor';

const mockOnSubmit = jest.fn();

const createMockMessageEditor = (): MessageEditorInstance => {
  const mockRef = { current: document.createElement('div') };
  return {
    _internal: {
      ref: jest.fn((node) => {
        if (node) {
          mockRef.current = node;
        }
      }) as any,
      onChange: jest.fn(),
    },
    clear: jest.fn(),
    focus: jest.fn(),
    getContent: jest.fn(() => ''),
    setContent: jest.fn(),
    isEmpty: false,
  };
};

describe('MessageEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const messageEditor = createMockMessageEditor();
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    expect(screen.getByTestId('messageEditor')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    const messageEditor = createMockMessageEditor();
    const placeholder = 'Type a message...';
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        placeholder={placeholder}
        data-test-subj="messageEditor"
      />
    );

    const editor = screen.getByTestId('messageEditor');
    expect(editor).toHaveAttribute('data-placeholder', placeholder);
  });

  it('renders as disabled', () => {
    const messageEditor = createMockMessageEditor();
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        disabled={true}
        data-test-subj="messageEditor"
      />
    );

    const editor = screen.getByTestId('messageEditor');
    expect(editor).toHaveAttribute('contentEditable', 'false');
    expect(editor).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not submit form during IME composition', () => {
    const messageEditor = createMockMessageEditor();
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    const editor = screen.getByTestId('messageEditor');

    // Start IME composition
    fireEvent.compositionStart(editor);

    // Press Enter during composition (should not submit)
    fireEvent.keyDown(editor, {
      key: 'Enter',
      shiftKey: false,
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // End IME composition
    fireEvent.compositionEnd(editor);

    // Press Enter after composition (should submit)
    fireEvent.keyDown(editor, {
      key: 'Enter',
      shiftKey: false,
    });
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('allows line break with Shift+Enter', () => {
    const messageEditor = createMockMessageEditor();
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    const editor = screen.getByTestId('messageEditor');

    // Press Shift+Enter (should not submit)
    fireEvent.keyDown(editor, {
      key: 'Enter',
      shiftKey: true,
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with Enter key when not composing', () => {
    const messageEditor = createMockMessageEditor();
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    const editor = screen.getByTestId('messageEditor');

    // Press Enter without composition
    fireEvent.keyDown(editor, {
      key: 'Enter',
      shiftKey: false,
    });
    expect(mockOnSubmit).toHaveBeenCalled();
  });
});
