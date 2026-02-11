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

  return instance;
};
