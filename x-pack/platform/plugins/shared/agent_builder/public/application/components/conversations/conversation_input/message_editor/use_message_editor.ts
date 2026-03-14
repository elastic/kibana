/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useMemo, useState, useCallback } from 'react';
import type { CommandMatchResult } from './command_menu';
import { useCommandMenu } from './command_menu';
import { useCommandMenuPrefetch } from './command_menu/use_command_menu_prefetch';

export interface MessageEditorInstance {
  ref: React.RefObject<HTMLDivElement>;
  onChange: () => void;
  onFocus: () => void;
  commandMatch: CommandMatchResult;
  /** Dismiss the active action menu */
  dismissActionMenu: () => void;
  /** Handle selection of an item from the command menu */
  handleCommandSelect: (selectedText: string) => void;
}

export interface MessageEditorController {
  focus: () => void;
  getContent: () => string;
  setContent: (text: string) => void;
  clear: () => void;
  isEmpty: boolean;
}

/**
 * Creates reactive and imperative handles for controlling MessageEditor.
 *
 * `messageEditor` should be passed to MessageEditor component.
 * `controller` can be used by consumer to imperatively control and access the state of a child message editor component.
 *
 * @example
 * const { messageEditor, controller } = useMessageEditor();
 * controller.focus();
 * const content = controller.getContent();
 * if (controller.isEmpty) {
 *   // Submit button disabled
 * }
 *
 * <MessageEditor messageEditor={messageEditor} onSubmit={handleSubmit} />
 */
export const useMessageEditor = (): {
  messageEditor: MessageEditorInstance;
  controller: MessageEditorController;
} => {
  const {
    match: commandMatch,
    dismiss: dismissCommandMenu,
    checkInputForCommand,
  } = useCommandMenu();
  const prefetchCommandMenus = useCommandMenuPrefetch();
  const ref = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const syncIsEmpty = useCallback(() => {
    if (!ref?.current) {
      return;
    }
    const nextIsEmpty = !ref.current.textContent || ref.current.textContent.trim() === '';
    if (nextIsEmpty) {
      // If current text content is empty clear innerHTML
      // This is required so the :empty pseudo-class gets reset and the placeholder is shown
      ref.current.innerHTML = '';
    }
    setIsEmpty(nextIsEmpty);
  }, []);

  const messageEditor = useMemo(
    () => ({
      ref,
      onChange: () => {
        syncIsEmpty();
        if (ref.current) {
          checkInputForCommand(ref.current);
        }
      },
      onFocus: () => {
        prefetchCommandMenus();
        // Must request animation frame as some browsers have not instantiated the user's cursor selection when the focus event fires
        requestAnimationFrame(() => {
          if (ref.current) {
            checkInputForCommand(ref.current);
          }
        });
      },
      commandMatch,
      dismissActionMenu: dismissCommandMenu,
      handleCommandSelect: (selectedText: string) => {
        if (!ref.current || !commandMatch.activeCommand) {
          return;
        }
        const text = ref.current.textContent ?? '';
        const { commandStartOffset, query, command } = commandMatch.activeCommand;
        const cursorPos = commandStartOffset + command.sequence.length + query.length;
        const newText =
          text.slice(0, commandStartOffset) + selectedText + ' ' + text.slice(cursorPos);
        ref.current.textContent = newText;
        syncIsEmpty();
        // Position cursor after inserted text + space
        const selection = window.getSelection();
        if (selection && ref.current.firstChild) {
          const newCursorPos = commandStartOffset + selectedText.length + 1;
          selection.setPosition(ref.current.firstChild, newCursorPos);
        }
        dismissCommandMenu();
      },
    }),
    [syncIsEmpty, checkInputForCommand, prefetchCommandMenus, commandMatch, dismissCommandMenu]
  );

  const controller = useMemo(
    () => ({
      focus: () => {
        ref.current?.focus();
      },
      getContent: () => {
        return ref.current?.textContent ?? '';
      },
      setContent: (text: string) => {
        if (ref.current) {
          ref.current.textContent = text;
          syncIsEmpty();
          // Set caret position at the end of the text
          const selection = window.getSelection();
          if (selection && ref.current.firstChild) {
            selection.setPosition(ref.current.firstChild, text.length);
          }
        }
      },
      clear: () => {
        if (ref.current) {
          ref.current.textContent = '';
          setIsEmpty(true);
        }
      },
      isEmpty,
    }),
    [isEmpty, syncIsEmpty]
  );

  return { messageEditor, controller };
};
