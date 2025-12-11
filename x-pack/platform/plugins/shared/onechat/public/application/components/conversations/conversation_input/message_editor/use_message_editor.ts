/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useMemo, useState, useCallback } from 'react';

export interface MessageEditorInstance {
  _internal: {
    ref: React.RefObject<HTMLDivElement>;
    onChange: () => void;
  };
  focus: () => void;
  getContent: () => string;
  setContent: (text: string) => void;
  clear: () => void;
  isEmpty: boolean;
  /**
   * Insert a mention reference at the current cursor position,
   * replacing the @searchTerm with @type:id format.
   *
   * @param id - The saved object ID of the visualization
   * @param type - The mention type ('viz' or 'map')
   * @param replaceLength - Number of characters to replace (searchTerm length + 1 for @)
   */
  insertMention: (id: string, type: 'viz' | 'map', replaceLength: number) => void;
  /**
   * Remove a mention text from the editor content.
   *
   * @param mentionText - The full mention text to remove (e.g., "@viz:abc123")
   */
  removeMentionText: (mentionText: string) => void;
}

/**
 * Creates an imperative handle for controlling MessageEditor
 *
 * @example
 * const editor = useMessageEditor();
 * editor.focus();
 * const content = editor.getContent();
 * if (editor.isEmpty) {
 *   // Submit button disabled
 * }
 *
 * <MessageEditor messageEditor={editor} />
 */
export const useMessageEditor = (): MessageEditorInstance => {
  const ref = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const syncIsEmpty = useCallback(() => {
    if (!ref?.current?.textContent) {
      setIsEmpty(true);
      return;
    }
    const nextIsEmpty = ref.current.textContent.trim() === '';
    if (nextIsEmpty) {
      // If current text content is empty clear innerHTML
      // This is required so the :empty pseudo-class gets reset and the placeholder is shown
      ref.current.innerHTML = '';
    }
    setIsEmpty(nextIsEmpty);
  }, []);

  const instance = useMemo(
    () => ({
      _internal: {
        ref,
        onChange: () => {
          syncIsEmpty();
        },
      },
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
          // Dispatch input event to trigger highlight layer update
          ref.current.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
      },
      clear: () => {
        if (ref.current) {
          ref.current.textContent = '';
          setIsEmpty(true);
          // Dispatch input event to trigger highlight layer update
          ref.current.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }
      },
      insertMention: (id: string, type: 'viz' | 'map', replaceLength: number) => {
        const editor = ref.current;
        if (!editor) {
          // eslint-disable-next-line no-console
          console.debug('[insertMention] No editor ref');
          return;
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          // eslint-disable-next-line no-console
          console.debug('[insertMention] No selection');
          return;
        }

        const range = selection.getRangeAt(0);
        if (!editor.contains(range.startContainer)) {
          // eslint-disable-next-line no-console
          console.debug('[insertMention] Selection not in editor');
          return;
        }

        // Get current text and cursor position
        const text = editor.textContent || '';
        const cursorPos = getCursorPositionInEditor(editor, selection);

        // eslint-disable-next-line no-console
        console.debug('[insertMention] Current state:', { text, cursorPos, replaceLength });

        // Calculate the start position of the mention (@searchTerm)
        const mentionStart = cursorPos - replaceLength;
        if (mentionStart < 0) {
          // eslint-disable-next-line no-console
          console.debug('[insertMention] mentionStart < 0:', mentionStart);
          return;
        }

        // Create the mention reference text (add space after to move cursor out of mention)
        const mentionText = `@${type}:${id} `;

        // Construct new text: before mention + mention + after cursor
        const newText = text.substring(0, mentionStart) + mentionText + text.substring(cursorPos);

        // eslint-disable-next-line no-console
        console.debug('[insertMention] New text:', newText);

        // Update the editor content
        editor.textContent = newText;
        syncIsEmpty();

        // Position cursor after the inserted mention
        const newCursorPos = mentionStart + mentionText.length;
        const textNode = editor.firstChild;
        if (textNode && selection) {
          const newRange = document.createRange();
          try {
            newRange.setStart(textNode, Math.min(newCursorPos, textNode.textContent?.length || 0));
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } catch (e) {
            // Fallback: focus at end
            editor.focus();
          }
        }

        // Dispatch input event to trigger highlight layer update
        editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
      },
      removeMentionText: (mentionText: string) => {
        const editor = ref.current;
        if (!editor) {
          return;
        }

        const text = editor.textContent || '';
        // Look for the mention text (with optional trailing space)
        const mentionWithSpace = `${mentionText} `;
        let newText: string;

        if (text.includes(mentionWithSpace)) {
          // Remove mention with trailing space
          newText = text.replace(mentionWithSpace, '');
        } else if (text.includes(mentionText)) {
          // Remove mention without trailing space
          newText = text.replace(mentionText, '');
        } else {
          // Mention not found, nothing to remove
          return;
        }

        // Clean up any double spaces that might result
        newText = newText.replace(/  +/g, ' ').trim();

        // Update the editor content
        editor.textContent = newText;
        syncIsEmpty();

        // Dispatch input event to trigger highlight layer update
        editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
      },
      isEmpty,
    }),
    [isEmpty, syncIsEmpty]
  );

  return instance;
};

/**
 * Helper function to get cursor position within the editor
 */
function getCursorPositionInEditor(editor: HTMLElement, selection: Selection): number {
  const range = selection.getRangeAt(0);
  const preCaretRange = document.createRange();
  preCaretRange.selectNodeContents(editor);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  return preCaretRange.toString().length;
}
