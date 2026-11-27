/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/code-editor';

type Editor = monaco.editor.IStandaloneCodeEditor;

export interface Position {
  readonly lineNumber: number;
  readonly column: number;
}

export interface Range {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

/** One `executeEdits` operation; `text` is `null` for a pure deletion, as in Monaco. */
export interface Edit {
  readonly range: Range;
  readonly text: string | null;
  readonly forceMoveMarkers?: boolean;
}

/** A change as Monaco reports it in a content-changed event. */
export interface ResolvedChange {
  readonly rangeOffset: number;
  readonly rangeLength: number;
  readonly text: string;
}

type Disposable = monaco.IDisposable;

/** The part of the model API the editor doubles implement. */
export type ModelDouble = Pick<
  monaco.editor.ITextModel,
  'getValue' | 'getValueLength' | 'getOffsetAt'
> & {
  readonly getPositionAt: (offset: number) => Position;
};

/**
 * The part of the editor API every double implements, checked against the real signatures.
 * A method that is not listed here is `undefined` on the double, so add it to the double and to
 * this type together instead of reaching for a cast.
 */
export type EditorDoubleCore = Pick<
  Editor,
  'focus' | 'revealPosition' | 'executeEdits' | 'getValue' | 'getDomNode' | 'onDidBlurEditorText'
> & {
  readonly getModel: () => ModelDouble | null;
  readonly getPosition: () => Position | null;
  readonly setPosition: (position: Position) => void;
  readonly onDidChangeCursorPosition: (
    listener: (event: { position: Position }) => void
  ) => Disposable;
  readonly createDecorationsCollection: (
    decorations?: monaco.editor.IModelDeltaDecoration[]
  ) => Pick<monaco.editor.IEditorDecorationsCollection, 'clear'>;
};

/** The API of the `createFakeMonacoEditor` double. */
export type FakeMonacoEditorApi = EditorDoubleCore & Pick<Editor, 'getScrolledVisiblePosition'>;

export interface FakeDecorationsCollection {
  readonly decorations: readonly monaco.editor.IModelDeltaDecoration[];
  readonly clear: jest.Mock;
  readonly isCleared: () => boolean;
}

export interface FakeMonacoEditor {
  /**
   * The double as the editor type production code asks for. It implements `FakeMonacoEditorApi`
   * only; see the one cast in `createFakeMonacoEditor`.
   */
  readonly editor: Editor;
  readonly getText: () => string;
  /** Replaces the document without going through an edit, like a controlled `value` prop would. */
  readonly setText: (text: string) => void;
  readonly getPosition: () => Position | null;
  readonly focus: jest.Mock;
  readonly revealPosition: jest.Mock;
  readonly executeEdits: jest.Mock;
  readonly collections: readonly FakeDecorationsCollection[];
  /** The editor's container, and the input inside it that keys go to, as in Monaco. */
  readonly domNode: HTMLElement;
  readonly input: HTMLElement;
  /** Presses a key in the input; says whether it was cancelled, or kept from leaving the editor. */
  readonly pressKey: (
    key: string,
    init?: KeyboardEventInit
  ) => { defaultPrevented: boolean; propagationStopped: boolean };
  /** Moves the caret and tells the cursor listeners, like the user clicking or arrowing. */
  readonly moveCaretTo: (offset: number) => void;
  /** Tells the blur listeners. */
  readonly blur: () => void;
  /** Where a position is drawn, relative to the editor: a grid of 7px by 18px characters. */
  readonly getScrolledVisiblePosition: jest.Mock;
  /** How many listeners of all kinds are attached right now. */
  readonly listenerCount: () => number;
}

/** Offsets count `\n` as one character, like a Monaco model with the LF end-of-line sequence. */
export const offsetAt = (text: string, { lineNumber, column }: Position): number => {
  const lines = text.split('\n');
  let offset = 0;
  for (let index = 0; index < lineNumber - 1 && index < lines.length; index++) {
    offset += lines[index].length + 1;
  }
  return Math.min(offset + column - 1, text.length);
};

export const positionAt = (text: string, offset: number): Position => {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, clamped).split('\n');
  return { lineNumber: before.length, column: before[before.length - 1].length + 1 };
};

/**
 * Applies a batch of `executeEdits` operations like Monaco: every range refers to the text before
 * the batch, and the changes come back from the end of the text to the start.
 */
export const applyEdits = (
  text: string,
  edits: readonly Edit[]
): { readonly text: string; readonly changes: readonly ResolvedChange[] } => {
  const changes = edits
    .map(({ range, text: inserted }) => {
      const from = offsetAt(text, { lineNumber: range.startLineNumber, column: range.startColumn });
      const to = offsetAt(text, { lineNumber: range.endLineNumber, column: range.endColumn });
      return { rangeOffset: from, rangeLength: to - from, text: inserted ?? '' };
    })
    // From the end, so earlier offsets stay valid while the batch is applied.
    .sort((a, b) => b.rangeOffset - a.rangeOffset);
  const next = changes.reduce(
    (acc, { rangeOffset, rangeLength, text: inserted }) =>
      `${acc.slice(0, rangeOffset)}${inserted}${acc.slice(rangeOffset + rangeLength)}`,
    text
  );
  return { text: next, changes };
};

/**
 * A Monaco editor double with a real document model (multi-line offsets, edits, positions) and
 * decoration collections that record what was drawn. Pass `withModel: false` for an editor that
 * has not got a model yet.
 */
export const createFakeMonacoEditor = (
  initialText: string,
  { withModel = true, position }: { withModel?: boolean; position?: Position | null } = {}
): FakeMonacoEditor => {
  let text = initialText;
  let currentPosition: Position | null =
    position === undefined ? { lineNumber: 1, column: 1 } : position;
  const collections: FakeDecorationsCollection[] = [];

  const model: ModelDouble = {
    getValue: () => text,
    getValueLength: () => text.length,
    getOffsetAt: (pos: Position) => offsetAt(text, pos),
    getPositionAt: (offset: number) => positionAt(text, offset),
  };

  const domNode = document.createElement('div');
  const input = document.createElement('textarea');
  domNode.appendChild(input);
  // Whatever holds the editor, to tell a key that left it from one that was stopped on the way.
  const surroundings = document.createElement('div');
  surroundings.appendChild(domNode);
  let keyListeners = 0;
  const addDomListener = domNode.addEventListener.bind(domNode);
  const removeDomListener = domNode.removeEventListener.bind(domNode);
  domNode.addEventListener = (...args: Parameters<typeof addDomListener>) => {
    if (args[0] === 'keydown') keyListeners++;
    addDomListener(...args);
  };
  domNode.removeEventListener = (...args: Parameters<typeof removeDomListener>) => {
    if (args[0] === 'keydown') keyListeners--;
    removeDomListener(...args);
  };
  const cursorListeners = new Set<(event: { position: Position }) => void>();
  const blurListeners = new Set<() => void>();
  const subscribe = <T>(listeners: Set<T>, listener: T) => {
    listeners.add(listener);
    return { dispose: () => listeners.delete(listener) };
  };

  const getScrolledVisiblePosition = jest.fn((at: Position) => ({
    top: (at.lineNumber - 1) * 18,
    left: (at.column - 1) * 7,
    height: 18,
  }));
  const focus = jest.fn();
  const revealPosition = jest.fn();
  const executeEdits = jest.fn((_source: string | null | undefined, edits: readonly Edit[]) => {
    text = applyEdits(text, edits).text;
    return true;
  });

  const editor: FakeMonacoEditorApi = {
    getModel: () => (withModel ? model : null),
    getPosition: () => currentPosition,
    setPosition: (next: Position) => {
      currentPosition = next;
    },
    getValue: () => text,
    focus,
    revealPosition,
    executeEdits,
    getDomNode: () => domNode,
    getScrolledVisiblePosition,
    onDidChangeCursorPosition: (listener: (event: { position: Position }) => void) =>
      subscribe(cursorListeners, listener),
    onDidBlurEditorText: (listener: () => void) => subscribe(blurListeners, listener),
    createDecorationsCollection: (decorations) => {
      let cleared = false;
      const clear = jest.fn(() => {
        cleared = true;
      });
      const collection: FakeDecorationsCollection = {
        decorations: decorations ?? [],
        clear,
        isCleared: () => cleared,
      };
      collections.push(collection);
      return collection;
    },
  };

  return {
    // The one cast: production code takes the full editor type, the double implements the
    // `FakeMonacoEditorApi` subset (checked above), so calling anything else is a test bug.
    editor: editor as Editor,
    getText: () => text,
    setText: (next) => {
      text = next;
    },
    getPosition: () => currentPosition,
    focus,
    revealPosition,
    executeEdits,
    collections,
    domNode,
    input,
    pressKey: (key, init = {}) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
      let leftTheEditor = false;
      const markLeft = () => {
        leftTheEditor = true;
      };
      surroundings.addEventListener('keydown', markLeft);
      input.dispatchEvent(event);
      surroundings.removeEventListener('keydown', markLeft);
      return { defaultPrevented: event.defaultPrevented, propagationStopped: !leftTheEditor };
    },
    moveCaretTo: (offset) => {
      currentPosition = positionAt(text, offset);
      cursorListeners.forEach((listener) => listener({ position: currentPosition as Position }));
    },
    blur: () => blurListeners.forEach((listener) => listener()),
    getScrolledVisiblePosition,
    listenerCount: () => keyListeners + cursorListeners.size + blurListeners.size,
  };
};
