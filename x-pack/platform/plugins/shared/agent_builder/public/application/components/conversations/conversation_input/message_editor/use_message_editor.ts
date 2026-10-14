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
import {
  CommandBadgeSerializationError,
  createCommandBadgeElement,
  deserializeInputSegments,
} from './command_badge';
import { serializeEditorContent } from './serialize';
import {
  createAttachmentPlaceholderElement,
  getPlaceholderNamesFromElement,
  removePlaceholderByName as removePlaceholderByNameFromDom,
  type PlaceholderKind,
} from './attachment_placeholder';
import {
  createCommandRange,
  createTextFragment,
  ensureCaretTargetBeforeFirstBadge,
  insertSpaceAfter,
  placeCursorAfter,
  placeCursorAtEnd,
  stripZeroWidthSpaces,
} from './utils';

export interface MessageEditorInstance {
  ref: React.RefObject<HTMLDivElement>;
  onChange: () => void;
  onFocus: () => void;
  commandMatch: CommandMatchResult;
  /** Dismiss the active action menu */
  dismissActionMenu: () => void;
  /** Handle selection of an item from the command menu */
  handleCommandSelect: (selection: CommandBadgeData) => void;
  /** Reports whether the active command's mounted menu has anything to show, for a given query */
  reportMenuContent: (hasVisibleContent: boolean, forQuery: string) => void;
}

export interface MessageEditorController {
  focus: () => void;
  getContent: () => string;
  setContent: (text: string) => void;
  clear: () => void;
  isEmpty: boolean;
  /** Names of the chips of `kind` (images by default). */
  getPlaceholderNames: (kind?: PlaceholderKind) => string[];
  removePlaceholderByName: (name: string, kind?: PlaceholderKind) => void;
}

// The limit applies to what is sent, and attachment placeholders and command badges serialize to
// markdown links longer than the text they display. Falls back to the displayed length for a
// badge that cannot be serialized, which submit reports on its own.
const getSerializedLength = (element: HTMLElement, displayedLength: number): number => {
  try {
    return serializeEditorContent(element).length;
  } catch (error) {
    if (error instanceof CommandBadgeSerializationError) {
      return displayedLength;
    }
    throw error;
  }
};

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
  onContentChange,
}: {
  ref: RefObject<HTMLDivElement>;
  syncIsEmpty: () => void;
  onEditorFocus?: () => void;
  onContentChange?: () => void;
}): MessageEditorInstance => {
  const {
    match: commandMatch,
    dismiss: dismissCommandMenu,
    checkInputForCommand,
    reportContent,
  } = useCommandMenu();
  const prefetchCommandMenus = useCommandMenuPrefetch();

  const messageEditor = useMemo(
    () => ({
      ref,
      // Sync empty state, maintain caret targets, and re-evaluate command menu on every input change
      onChange: () => {
        syncIsEmpty();
        onContentChange?.();
        if (ref.current) {
          if (ensureCaretTargetBeforeFirstBadge(ref.current)) {
            const sel = window.getSelection();
            const zwsNode = ref.current.firstChild;
            if (sel && zwsNode instanceof Text) {
              placeCursorAfter(zwsNode, sel);
            }
          }
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
      reportMenuContent: reportContent,
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
        ensureCaretTargetBeforeFirstBadge(ref.current);

        const space = insertSpaceAfter(badge, ref.current);
        placeCursorAfter(space, sel);

        syncIsEmpty();
        dismissCommandMenu();
        onContentChange?.();
      },
    }),
    [
      ref,
      syncIsEmpty,
      onContentChange,
      checkInputForCommand,
      prefetchCommandMenus,
      commandMatch,
      dismissCommandMenu,
      reportContent,
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
}: {
  ref: RefObject<HTMLDivElement>;
  syncIsEmpty: () => void;
  isEmpty: boolean;
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
        const segments = deserializeInputSegments(text);
        ref.current.innerHTML = '';

        for (const segment of segments) {
          if (segment.type === 'text') {
            ref.current.appendChild(createTextFragment(segment.value));
          } else if (segment.type === 'badge') {
            ref.current.appendChild(createCommandBadgeElement(segment.data));
          } else if (segment.type === 'image') {
            ref.current.appendChild(createAttachmentPlaceholderElement(segment.name));
          } else if (segment.type === 'pdf') {
            ref.current.appendChild(createAttachmentPlaceholderElement(segment.name, 'pdf'));
          }
        }

        ensureCaretTargetBeforeFirstBadge(ref.current);
        syncIsEmpty();
        placeCursorAtEnd(ref.current);
      },
      clear: () => {
        if (ref.current) {
          ref.current.innerHTML = '';
          syncIsEmpty();
        }
      },
      getPlaceholderNames: (kind?: PlaceholderKind) =>
        ref.current ? getPlaceholderNamesFromElement(ref.current, kind) : [],
      removePlaceholderByName: (name: string, kind?: PlaceholderKind) => {
        if (ref.current) {
          removePlaceholderByNameFromDom(ref.current, name, kind);
          syncIsEmpty();
        }
      },
      isEmpty,
    }),
    [ref, isEmpty, syncIsEmpty]
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
  options: { onEditorFocus?: () => void; onContentChange?: () => void; maxLength?: number } = {}
): {
  messageEditor: MessageEditorInstance;
  controller: MessageEditorController;
  overLimitCharacterCount: number;
} => {
  const { onEditorFocus, onContentChange, maxLength = Infinity } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [overLimitCharacterCount, setOverLimitCharacterCount] = useState(0);

  const syncIsEmpty = useCallback(() => {
    if (!ref?.current) {
      return;
    }
    const textContent = stripZeroWidthSpaces(ref.current.textContent ?? '');
    const contentLength = getSerializedLength(ref.current, textContent.length);
    setOverLimitCharacterCount(contentLength > maxLength ? contentLength : 0);
    const nextIsEmpty = !textContent || textContent.trim() === '';
    if (nextIsEmpty) {
      // If current text content is empty clear innerHTML
      // This is required so the :empty pseudo-class gets reset and the placeholder is shown
      ref.current.innerHTML = '';
    }
    setIsEmpty(nextIsEmpty);
  }, [maxLength]);

  const instance = useMessageEditorInstance({ ref, syncIsEmpty, onEditorFocus, onContentChange });
  const controller = useMessageEditorController({ ref, syncIsEmpty, isEmpty });
  const messageEditor = useMemo(
    () => ({
      messageEditor: instance,
      controller,
      overLimitCharacterCount,
    }),
    [instance, controller, overLimitCharacterCount]
  );

  return messageEditor;
};
