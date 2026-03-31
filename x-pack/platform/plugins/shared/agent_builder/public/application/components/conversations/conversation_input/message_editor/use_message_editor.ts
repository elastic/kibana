/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RefObject } from 'react';
import { useRef, useMemo, useState, useCallback } from 'react';
import type { CommandMatchResult, CommandBadgeData } from './command_menu';
import { useCommandMenu, useCommandMenuPrefetch } from './command_menu';
import { createCommandBadgeElement, deserializeCommandBadge } from './command_badge';
import { serializeEditorContent } from './serialize';
import { createCommandRange, insertSpaceAfter, placeCursorAfter, placeCursorAtEnd } from './utils';

export interface MessageEditorInstance {
  ref: React.RefObject<HTMLDivElement>;
  onChange: () => void;
  onFocus: () => void;
  commandMatch: CommandMatchResult;
  /** Dismiss the active action menu */
  dismissActionMenu: () => void;
  /** Handle selection of an item from the command menu */
  handleCommandSelect: (selection: CommandBadgeData) => void;
}

export interface MessageEditorController {
  focus: () => void;
  getContent: () => string;
  setContent: (text: string) => void;
  clear: () => void;
  isEmpty: boolean;
}

/**
 * Reactive bindings for the MessageEditor component.
 *
 * Provides event handlers (onChange, onFocus), the current command menu match state,
 * and `handleCommandSelect` which replaces the in-progress command text (e.g. "/summ")
 * with a styled badge element.
 */
const useMessageEditorInstance = ({
  ref,
  syncIsEmpty,
  onEditorFocus,
}: {
  ref: RefObject<HTMLDivElement>;
  syncIsEmpty: () => void;
  onEditorFocus?: () => void;
}): MessageEditorInstance => {
  const {
    match: commandMatch,
    dismiss: dismissCommandMenu,
    checkInputForCommand,
  } = useCommandMenu();
  const prefetchCommandMenus = useCommandMenuPrefetch();

  const messageEditor = useMemo(
    () => ({
      ref,
      // Sync empty state and re-evaluate command menu on every input change
      onChange: () => {
        syncIsEmpty();
        if (ref.current) {
          checkInputForCommand(ref.current);
        }
      },
      // Eagerly load command menu data and check for active commands once the cursor is ready
      onFocus: () => {
        prefetchCommandMenus();
        onEditorFocus?.();
        // Must request animation frame as some browsers have not instantiated the user's cursor selection when the focus event fires
        requestAnimationFrame(() => {
          if (ref.current) {
            checkInputForCommand(ref.current);
          }
        });
      },
      commandMatch,
      dismissActionMenu: dismissCommandMenu,
      // Replace the command text (e.g. "/summ") with a badge element:
      handleCommandSelect: (selection: CommandBadgeData) => {
        if (!ref.current || !commandMatch.activeCommand) {
          return;
        }

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          return;
        }

        const commandRange = createCommandRange(ref.current, commandMatch.activeCommand);
        commandRange.deleteContents();

        const badge = createCommandBadgeElement(selection);
        commandRange.insertNode(badge);

        const space = insertSpaceAfter(badge, ref.current);
        placeCursorAfter(space, sel);

        syncIsEmpty();
        dismissCommandMenu();
      },
    }),
    [
      ref,
      syncIsEmpty,
      checkInputForCommand,
      prefetchCommandMenus,
      commandMatch,
      dismissCommandMenu,
      onEditorFocus,
    ]
  );
  return messageEditor;
};

/**
 * Imperative API for the consumer to read, write, and clear the editor content.
 *
 * - `getContent` serializes the editor DOM (including badges) to a string with
 *   badge markdown-links, e.g. `[/Summarize](skill://skill-1)`.
 * - `setContent` deserializes that format back into DOM nodes (text + badges).
 * - `clear` resets the editor to empty.
 */
const useMessageEditorController = ({
  ref,
  syncIsEmpty,
  isEmpty,
  setIsEmpty,
}: {
  ref: RefObject<HTMLDivElement>;
  syncIsEmpty: () => void;
  isEmpty: boolean;
  setIsEmpty: (next: boolean) => void;
}): MessageEditorController => {
  const controller = useMemo(
    () => ({
      focus: () => {
        ref.current?.focus();
      },
      getContent: () => {
        if (!ref.current) {
          return '';
        }
        return serializeEditorContent(ref.current);
      },
      setContent: (text: string) => {
        if (!ref.current) {
          return;
        }
        const segments = deserializeCommandBadge(text);
        ref.current.innerHTML = '';

        for (const segment of segments) {
          if (segment.type === 'text') {
            ref.current.appendChild(document.createTextNode(segment.value));
          } else if (segment.type === 'badge') {
            ref.current.appendChild(createCommandBadgeElement(segment.data));
          }
        }

        syncIsEmpty();
        placeCursorAtEnd(ref.current);
      },
      clear: () => {
        if (ref.current) {
          ref.current.innerHTML = '';
          setIsEmpty(true);
        }
      },
      isEmpty,
    }),
    [ref, isEmpty, setIsEmpty, syncIsEmpty]
  );
  return controller;
};

/**
 * Creates reactive and imperative handles for controlling MessageEditor.
 *
 * `messageEditor` should be passed to MessageEditor component.
 * `controller` can be used by consumer to imperatively control and access the state of a child message editor component.
 *
 * @example
 * const { messageEditor, controller } = useMessageEditor({ onEditorFocus: scheduleStaleCheck });
 * controller.focus();
 * const content = controller.getContent();
 * if (controller.isEmpty) {
 *   // Submit button disabled
 * }
 *
 * <MessageEditor messageEditor={messageEditor} onSubmit={handleSubmit} />
 */
export const useMessageEditor = (
  options: { onEditorFocus?: () => void } = {}
): {
  messageEditor: MessageEditorInstance;
  controller: MessageEditorController;
} => {
  const { onEditorFocus } = options;
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

  const instance = useMessageEditorInstance({ ref, syncIsEmpty, onEditorFocus });
  const controller = useMessageEditorController({ ref, syncIsEmpty, isEmpty, setIsEmpty });
  const messageEditor = useMemo(
    () => ({
      messageEditor: instance,
      controller,
    }),
    [instance, controller]
  );

  return messageEditor;
};
