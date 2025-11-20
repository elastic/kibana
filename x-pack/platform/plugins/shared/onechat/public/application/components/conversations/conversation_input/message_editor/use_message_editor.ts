/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useMemo, useState, useCallback } from 'react';

export interface MessageEditorHandle {
  focus: () => void;
  getContent: () => string;
  setContent: (html: string) => void;
  clear: () => void;
  isEmpty: () => boolean;
}

export interface MessageEditorInstance extends MessageEditorHandle {
  _internal: {
    ref: React.RefObject<MessageEditorHandle>;
    onChange: () => void;
  };
}

/**
 * Creates an imperative handle for controlling a MessageEditor component.
 * Manages isEmpty state internally to avoid manual synchronization.
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
  const ref = useRef<MessageEditorHandle>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const syncIsEmpty = useCallback(() => {
    setIsEmpty(ref.current?.isEmpty() ?? true);
  }, []);

  const instance = useMemo(
    () => ({
      _internal: {
        ref,
        onChange: syncIsEmpty,
      },
      focus: () => {
        ref.current?.focus();
      },
      getContent: () => {
        return ref.current?.getContent() ?? '';
      },
      setContent: (html: string) => {
        ref.current?.setContent(html);
      },
      clear: () => {
        ref.current?.clear();
      },
      isEmpty: () => isEmpty,
    }),
    [isEmpty, syncIsEmpty]
  );

  return instance;
};
