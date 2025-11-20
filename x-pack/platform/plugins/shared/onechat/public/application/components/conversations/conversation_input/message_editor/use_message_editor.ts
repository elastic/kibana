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
    const content = ref.current?.textContent ?? '';
    const nextIsEmpty = content.trim() === '';
    setIsEmpty(nextIsEmpty);
  }, []);

  const instance = useMemo(
    () => ({
      _internal: {
        ref,
        onChange: () => {
          // If current value is a single line break tag, set to empty string
          if (ref.current && ref.current.innerHTML === '<br>') {
            ref.current.innerHTML = '';
          }

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
