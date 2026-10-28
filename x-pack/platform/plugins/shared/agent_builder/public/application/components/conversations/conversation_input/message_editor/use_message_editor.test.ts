/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useMessageEditor } from './use_message_editor';
import { CommandId } from './command_menu';
import type { MessageEditorInstance } from './use_message_editor';
import { ZERO_WIDTH_SPACE, stripZeroWidthSpaces } from './utils';

jest.mock('../../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: () => true,
}));
jest.mock('./command_menu/use_command_menu_prefetch', () => ({
  useCommandMenuPrefetch: () => jest.fn(),
}));

const NBSP = ' ';

const attachRef = (instance: MessageEditorInstance, element: HTMLDivElement) => {
  (instance.ref as React.MutableRefObject<HTMLDivElement | null>).current = element;
};

const setCursorAtEnd = (element: HTMLElement) => {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
};

describe('useMessageEditor handleCommandSelect', () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  it('consumes the full query and inserts a trailing space', () => {
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);

    div.textContent = '#connector/workday';
    setCursorAtEnd(div);

    act(() => {
      result.current.messageEditor.onChange();
    });

    expect(result.current.messageEditor.commandMatch.activeCommand?.query).toBe(
      'connector/workday'
    );

    act(() => {
      result.current.messageEditor.handleCommandSelect({
        commandId: CommandId.Sml,
        label: 'connector/workday',
        id: 'chunk-1',
        metadata: {},
      });
    });

    const badge = div.querySelector('[data-command-badge]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe('#connector/workday');
    expect(stripZeroWidthSpaces(div.textContent ?? '')).toBe(`#connector/workday${NBSP}`);
  });
});

describe('useMessageEditor setContent', () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  it('restores a serialized image placeholder', () => {
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);

    act(() => {
      result.current.controller.setContent('[photo.png](image://photo.png)');
    });

    expect(result.current.controller.getPlaceholderNames()).toEqual(['photo.png']);
  });

  it('is not empty when the message only holds an image attachment', () => {
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);

    act(() => {
      result.current.controller.setContent('[photo.png](image://photo.png)');
    });

    expect(result.current.controller.isEmpty).toBe(false);
  });

  it('reports the character count only while the content is over maxLength', () => {
    const { result } = renderHook(() => useMessageEditor({ maxLength: 5 }));
    attachRef(result.current.messageEditor, div);

    act(() => {
      result.current.controller.setContent('hello');
    });
    expect(result.current.overLimitCharacterCount).toBe(0);

    act(() => {
      result.current.controller.setContent('hello world');
    });
    expect(result.current.overLimitCharacterCount).toBe('hello world'.length);

    act(() => {
      result.current.controller.clear();
    });
    expect(result.current.overLimitCharacterCount).toBe(0);
    expect(result.current.controller.isEmpty).toBe(true);
  });

  it('counts the serialized content, which is longer than the text of an image placeholder', () => {
    const serialized = '[photo.png](image://photo.png)';
    const { result } = renderHook(() => useMessageEditor({ maxLength: 20 }));
    attachRef(result.current.messageEditor, div);

    act(() => {
      result.current.controller.setContent(serialized);
    });

    // The placeholder displays 'photo.png' (9 characters) but is sent as 30
    expect(result.current.overLimitCharacterCount).toBe(serialized.length);
    expect(result.current.controller.getContent()).toBe(serialized);
  });

  it('keeps the controller identity while typing within the limit', () => {
    const { result } = renderHook(() => useMessageEditor({ maxLength: 100 }));
    attachRef(result.current.messageEditor, div);

    act(() => {
      result.current.controller.setContent('hello');
    });
    const { controller } = result.current;

    act(() => {
      result.current.controller.setContent('hello world');
    });

    expect(result.current.controller).toBe(controller);
  });
});

describe('useMessageEditor insertText', () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  it('types the text in an empty editor and opens the command menu', () => {
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);

    act(() => {
      result.current.controller.insertText('@');
    });

    expect(div.textContent).toBe('@');
    expect(result.current.messageEditor.commandMatch.activeCommand?.command.id).toBe(
      CommandId.Mention
    );
    expect(result.current.controller.isEmpty).toBe(false);
  });

  it('adds a space first when the caret follows a word', () => {
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);
    div.textContent = 'hello';
    setCursorAtEnd(div);

    act(() => {
      result.current.controller.insertText('@');
    });

    expect(div.textContent).toBe('hello @');
    expect(result.current.messageEditor.commandMatch.isActive).toBe(true);
  });

  it.each(['hello ', 'hello ', `${ZERO_WIDTH_SPACE}`])(
    'adds no space when the caret follows whitespace (%j)',
    (before) => {
      const { result } = renderHook(() => useMessageEditor());
      attachRef(result.current.messageEditor, div);
      div.textContent = before;
      setCursorAtEnd(div);

      act(() => {
        result.current.controller.insertText('@');
      });

      expect(div.textContent).toBe(`${before}@`);
    }
  );

  it('puts the text at the end when the caret is outside the editor', () => {
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);
    div.textContent = 'hello world';
    const outside = document.createElement('p');
    outside.textContent = 'elsewhere';
    document.body.appendChild(outside);
    setCursorAtEnd(outside);

    act(() => {
      result.current.controller.insertText('@');
    });

    expect(div.textContent).toBe('hello world @');
    expect(outside.textContent).toBe('elsewhere');
    document.body.removeChild(outside);
  });

  it('puts the text at the end when focusing moves the caret to the start of the editor', () => {
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);
    div.textContent = 'hello world';
    window.getSelection()?.removeAllRanges();
    // Browsers put the caret at the start of a contentEditable that gets focus without a selection
    jest.spyOn(div, 'focus').mockImplementation(() => {
      const range = document.createRange();
      range.setStart(div, 0);
      range.collapse(true);
      window.getSelection()?.addRange(range);
    });

    act(() => {
      result.current.controller.insertText('@');
    });

    expect(div.textContent).toBe('hello world @');
  });

  it('inserts at the caret, not at the end, when the caret is inside the editor', () => {
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);
    div.textContent = 'hello world';
    const range = document.createRange();
    range.setStart(div.firstChild!, 6);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    act(() => {
      result.current.controller.insertText('@');
    });

    expect(div.textContent).toBe('hello @world');
  });

  it('keeps the controller identity while the command menu state changes', () => {
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);
    act(() => {
      result.current.controller.insertText('@');
    });
    const { controller } = result.current;

    act(() => {
      result.current.messageEditor.dismissActionMenu();
    });

    expect(result.current.controller).toBe(controller);
  });
});
