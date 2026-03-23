/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MessageEditor } from './message_editor';
import type { MessageEditorController, MessageEditorInstance } from './use_message_editor';
import { CommandId } from './command_menu';
import type {
  CommandMenuComponentProps,
  CommandMenuHandle,
  CommandBadgeData,
} from './command_menu';

// TODO: Remove once the inline actions feature is no longer behind the experimental feature flag
jest.mock('../../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: () => true,
}));

jest.mock('./command_menu/cursor_rect', () => ({
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

const MockMenuComponent = React.forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  (_props, _ref) => <div />
);

const mockBadgeData: CommandBadgeData = {
  commandId: CommandId.Skill,
  label: 'Summarize',
  id: 'skill-1',
  metadata: {},
};

const ClickableMenuComponent = React.forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ onSelect }, _ref) => (
    <div>
      <button data-test-subj="menuOption" onClick={() => onSelect(mockBadgeData)}>
        Summarize
      </button>
    </div>
  )
);

const mockOnSubmit = jest.fn();

const createMockMessageEditor = (): {
  messageEditor: MessageEditorInstance;
  controller: MessageEditorController;
} => {
  const mockRef = { current: null } as React.RefObject<HTMLDivElement>;
  return {
    messageEditor: {
      ref: mockRef,
      onChange: jest.fn(),
      onFocus: jest.fn(),
      commandMatch: { isActive: false, activeCommand: null },
      dismissActionMenu: jest.fn(),
      handleCommandSelect: jest.fn(),
    },
    controller: {
      clear: jest.fn(),
      focus: jest.fn(),
      getContent: jest.fn(() => ''),
      setContent: jest.fn(),
      isEmpty: false,
    },
  };
};

describe('MessageEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { messageEditor } = createMockMessageEditor();
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
    const { messageEditor } = createMockMessageEditor();
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
    const { messageEditor } = createMockMessageEditor();
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
    const { messageEditor } = createMockMessageEditor();
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
    const { messageEditor } = createMockMessageEditor();
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
    const { messageEditor } = createMockMessageEditor();
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

  it('calls dismissCommand when Escape is pressed', () => {
    const { messageEditor } = createMockMessageEditor();
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    const editor = screen.getByTestId('messageEditor');
    fireEvent.keyDown(editor, { key: 'Escape' });

    expect(messageEditor.dismissActionMenu).toHaveBeenCalled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('renders container wrapper around editor', () => {
    const { messageEditor } = createMockMessageEditor();
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
    const { messageEditor } = createMockMessageEditor();
    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    expect(screen.getByTestId('messageEditor')).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('renders popover content when command is active', () => {
    const { messageEditor } = createMockMessageEditor();

    const { rerender } = render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    messageEditor.commandMatch = {
      isActive: true,
      activeCommand: {
        command: {
          id: CommandId.Attachment,
          sequence: '@',
          name: 'Attachment',
          scheme: 'attachment',
          menuComponent: MockMenuComponent,
        },
        commandStartOffset: 0,
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

    expect(screen.getByTestId('commandMenuPopover-content')).toBeInTheDocument();
  });

  it('calls handleCommandSelect when a menu option is clicked', () => {
    const { messageEditor } = createMockMessageEditor();
    messageEditor.commandMatch = {
      isActive: true,
      activeCommand: {
        command: {
          id: CommandId.Skill,
          sequence: '/',
          name: 'Skill',
          scheme: 'skill',
          menuComponent: ClickableMenuComponent,
        },
        commandStartOffset: 0,
        query: '',
      },
    };

    render(
      <MessageEditor
        messageEditor={messageEditor}
        onSubmit={mockOnSubmit}
        data-test-subj="messageEditor"
      />
    );

    fireEvent.click(screen.getByTestId('menuOption'));

    expect(messageEditor.handleCommandSelect).toHaveBeenCalledWith(mockBadgeData);
  });
});
