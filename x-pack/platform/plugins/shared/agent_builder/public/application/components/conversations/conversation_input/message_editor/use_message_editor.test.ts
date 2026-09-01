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
    expect(stripZeroWidthSpaces(div.textContent ?? '')).toBe(`@connector/workday${NBSP}`);
  });
});
