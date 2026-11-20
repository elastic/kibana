/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import type { monaco } from '@kbn/code-editor';
import type { Position } from './fake_monaco_editor';
import { offsetAt, positionAt } from './fake_monaco_editor';

type Editor = monaco.editor.IStandaloneCodeEditor;

export interface MockCodeEditorChange {
  readonly rangeOffset: number;
  /** How many characters of the old text the change replaces, as in a Monaco change event. */
  readonly rangeLength: number;
  readonly text: string;
}

/**
 * The change that turns `previous` into `next`, as Monaco reports it: where it starts, how much it
 * replaces, and what goes there. An edit ends at the caret (typing, a delete and a paste all
 * leave it there), so what follows the caret is unchanged and only the text before it is compared.
 */
export const changeBetween = (
  previous: string,
  next: string,
  caret: number = next.length
): MockCodeEditorChange => {
  const previousEnd = Math.max(0, previous.length - (next.length - caret));
  const limit = Math.min(previousEnd, caret);
  let start = 0;
  while (start < limit && previous[start] === next[start]) start++;
  return { rangeOffset: start, rangeLength: previousEnd - start, text: next.slice(start, caret) };
};

/** What Monaco hands an `onKeyDown` listener: the browser event, and ways to stop it. */
export interface MockKeyEvent {
  readonly browserEvent: KeyboardEvent;
  readonly preventDefault: () => void;
  readonly stopPropagation: () => void;
}

export interface MockCodeEditorProps {
  readonly value: string;
  readonly languageId: string;
  readonly onChange?: (
    value: string,
    event?: { readonly changes: readonly MockCodeEditorChange[] }
  ) => void;
  readonly dataTestSubj?: string;
  readonly 'aria-label'?: string;
  readonly placeholder?: string;
  readonly editorDidMount?: (editor: Editor) => void;
}

/** Knobs a test can turn; reset them in `beforeEach` with `resetMockCodeEditor`. */
export const mockCodeEditorState = {
  /** Column `getTargetAtClientPoint` reports, for drag-and-drop tests. */
  dropColumn: 1,
  /** Every decoration collection drawn on any mounted mock editor, in drawing order. */
  decorations: [] as Array<{
    decorations: readonly monaco.editor.IModelDeltaDecoration[];
    cleared: boolean;
  }>,
};

export const resetMockCodeEditor = (): void => {
  mockCodeEditorState.dropColumn = 1;
  mockCodeEditorState.decorations = [];
};

const MockCodeEditor = ({
  value,
  languageId,
  onChange,
  dataTestSubj,
  'aria-label': ariaLabel,
  placeholder,
  editorDidMount,
}: MockCodeEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Like Monaco, an editor tells every listener, and a listener can stop listening.
  const keyListeners = useRef(new Set<(event: MockKeyEvent) => void>());
  const blurListeners = useRef(new Set<() => void>());
  const cursorListeners = useRef(new Set<(event: { position: Position }) => void>());
  // Monaco mounts once and keeps the callbacks it was given; the editor reads what is current.
  const latest = useRef({ value, onChange, editorDidMount });
  latest.current = { value, onChange, editorDidMount };

  useEffect(() => {
    const caretOffset = () => textareaRef.current?.selectionStart ?? latest.current.value.length;
    const model = {
      getValue: () => latest.current.value,
      getValueLength: () => latest.current.value.length,
      getOffsetAt: (position: Position) => offsetAt(latest.current.value, position),
      getPositionAt: (offset: number) => positionAt(latest.current.value, offset),
    };
    const mounted = {
      focus: () => textareaRef.current?.focus(),
      getValue: () => latest.current.value,
      getModel: () => model,
      getPosition: () => positionAt(latest.current.value, caretOffset()),
      setPosition: (position: Position) => {
        const offset = offsetAt(latest.current.value, position);
        textareaRef.current?.setSelectionRange(offset, offset);
      },
      setSelection: () => undefined,
      revealPosition: () => undefined,
      getDomNode: () => textareaRef.current,
      onKeyDown: (listener: (event: MockKeyEvent) => void) => {
        keyListeners.current.add(listener);
        return { dispose: () => keyListeners.current.delete(listener) };
      },
      onDidBlurEditorText: (listener: () => void) => {
        blurListeners.current.add(listener);
        return { dispose: () => blurListeners.current.delete(listener) };
      },
      onDidChangeCursorPosition: (listener: (event: { position: Position }) => void) => {
        cursorListeners.current.add(listener);
        return { dispose: () => cursorListeners.current.delete(listener) };
      },
      getTargetAtClientPoint: () => ({
        position: { lineNumber: 1, column: mockCodeEditorState.dropColumn },
      }),
      // Like Monaco: apply the edit to the text and report it as a change.
      executeEdits: (
        _source: string,
        edits: ReadonlyArray<{
          range: {
            startLineNumber: number;
            startColumn: number;
            endLineNumber: number;
            endColumn: number;
          };
          text: string;
        }>
      ) => {
        const [{ range, text }] = edits;
        const current = latest.current.value;
        const from = offsetAt(current, {
          lineNumber: range.startLineNumber,
          column: range.startColumn,
        });
        const to = offsetAt(current, { lineNumber: range.endLineNumber, column: range.endColumn });
        latest.current.onChange?.(`${current.slice(0, from)}${text}${current.slice(to)}`, {
          changes: [{ rangeOffset: from, rangeLength: to - from, text }],
        });
      },
      createDecorationsCollection: (
        decorations: readonly monaco.editor.IModelDeltaDecoration[]
      ) => {
        const entry = { decorations, cleared: false };
        mockCodeEditorState.decorations.push(entry);
        return {
          clear: () => {
            entry.cleared = true;
          },
        };
      },
    };
    // The mock implements the part of the editor API the panel code uses.
    latest.current.editorDidMount?.(mounted as unknown as Editor);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      data-test-subj={dataTestSubj ?? 'mocked-code-editor'}
      data-language={languageId}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onBlur={() => blurListeners.current.forEach((listener) => listener())}
      onKeyDown={(event) =>
        keyListeners.current.forEach((listener) =>
          listener({
            browserEvent: event.nativeEvent,
            preventDefault: () => event.preventDefault(),
            stopPropagation: () => event.stopPropagation(),
          })
        )
      }
      onSelect={(event) => {
        const position = positionAt(value, event.currentTarget.selectionStart ?? value.length);
        cursorListeners.current.forEach((listener) => listener({ position }));
      }}
      onChange={(event) => {
        const next = event.target.value;
        const caret = event.target.selectionStart ?? next.length;
        onChange?.(next, { changes: [changeBetween(value, next, caret)] });
      }}
    />
  );
};

/** The value of the `@kbn/code-editor` module mock: `jest.mock('@kbn/code-editor', () => createCodeEditorModuleMock())`. */
export const createCodeEditorModuleMock = () => ({
  monaco: {
    languages: {
      getLanguages: () => [],
      register: () => undefined,
      setMonarchTokensProvider: () => undefined,
      setLanguageConfiguration: () => undefined,
    },
    editor: { InjectedTextCursorStops: { None: 3 } },
  },
  CodeEditor: MockCodeEditor,
});
