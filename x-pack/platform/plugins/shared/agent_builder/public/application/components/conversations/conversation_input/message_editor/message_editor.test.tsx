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
import { TriggerId } from './inline_actions';

// TODO: Remove once the inline actions feature is no longer behind the experimental feature flag
jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      settings: {
        client: {
          get: () => true,
        },
      },
    },
  }),
}));

jest.mock('./inline_actions/cursor_rect', () => ({
  getRectAtOffset: () => ({
    left: 100,
    top: 200,
    bottom: 220,
    right: 100,
    width: 0,
    height: 20,
    x: 100,
    y: 200,
    toJSON: () => ({}),
  }),
}));

const mockOnSubmit = jest.fn();

const createMockMessageEditor = (): MessageEditorInstance => {
  const mockRef = { current: null } as React.RefObject<HTMLDivElement>;
  return {
    _internal: {
      ref: mockRef,
      onChange: jest.fn(),
      triggerMatch: { isActive: false, activeTrigger: null },
    },
    clear: jest.fn(),
    focus: jest.fn(),
    getContent: jest.fn(() => ''),
    setContent: jest.fn(),
    isEmpty: false,
    dismissTrigger: jest.fn(),
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

  it('calls dismissTrigger when Escape is pressed', () => {
    const messageEditor = createMockMessageEditor();
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    const editor = screen.getByTestId('messageEditor');
    fireEvent.keyDown(editor, { key: 'Escape' });

    expect(messageEditor.dismissTrigger).toHaveBeenCalled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('renders container wrapper around editor', () => {
    const messageEditor = createMockMessageEditor();
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    const container = screen.getByTestId('messageEditor-container');
    const editor = screen.getByTestId('messageEditor');
    expect(container).toContainElement(editor);
  });

  it('has aria-haspopup="dialog" on the editor', () => {
    const messageEditor = createMockMessageEditor();
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    expect(screen.getByTestId('messageEditor')).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('renders popover content when trigger is active', () => {
    const messageEditor = createMockMessageEditor();

    const { rerender } = render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    messageEditor._internal.triggerMatch = {
      isActive: true,
      activeTrigger: {
        trigger: { id: TriggerId.Attachment, sequence: '@' },
        triggerStartOffset: 0,
        query: 'test',
      },
    };

    rerender(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    expect(screen.getByTestId('inlineActionPopover-content')).toBeInTheDocument();
  });
});
