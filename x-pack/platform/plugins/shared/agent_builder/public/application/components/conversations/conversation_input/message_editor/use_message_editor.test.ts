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
import { stripZeroWidthSpaces } from './utils';

jest.mock('../../../../hooks/use_context_engine_enabled', () => ({
  useContextEngineEnabled: () => true,
}));
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

  it('leaves an active mention alone once its query contains a space, so text after it stays untouched', () => {
    // A "type/name" SML mention can never contain a space, so matchCommand
    // ends it as soon as one appears — there's no longer a badge to commit
    // partway through a sentence like this.
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);

    div.textContent = 'look in @connector/workday is the best';
    setCursorAtEnd(div);

    act(() => {
      result.current.messageEditor.onChange();
    });

    expect(result.current.messageEditor.commandMatch.isActive).toBe(false);
    expect(div.textContent).toBe('look in @connector/workday is the best');
  });

  it('consumes the full query and inserts a trailing space', () => {
    const { result } = renderHook(() => useMessageEditor());
    attachRef(result.current.messageEditor, div);

    div.textContent = '@connector/workday';
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
    expect(badge!.textContent).toBe('@connector/workday');
    // Nothing left over: the full query was consumed, so a fresh
    // non-breaking space is appended so typing can continue after the badge.
    expect(stripZeroWidthSpaces(div.textContent ?? '')).toBe(`@connector/workday${NBSP}`);
  });
});
