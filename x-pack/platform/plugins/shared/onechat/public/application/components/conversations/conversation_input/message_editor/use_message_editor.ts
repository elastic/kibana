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
  setContent: (html: string) => void;
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
    let content = ref.current?.innerHTML ?? '';
    content = content.replace(/<br\s*\/?>/gi, '');
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
        return ref.current?.innerHTML ?? '';
      },
      setContent: (html: string) => {
        if (ref.current) {
          // Low risk for XSS as this input is localized to the user's editor
          // Sanitization must be performed server side before committing message
          // eslint-disable-next-line no-unsanitized/property
          ref.current.innerHTML = html;
          syncIsEmpty();
        }
      },
      clear: () => {
        if (ref.current) {
          ref.current.innerHTML = '';
          setIsEmpty(true);
        }
      },
      isEmpty,
    }),
    [isEmpty, syncIsEmpty]
  );

  return instance;
};
