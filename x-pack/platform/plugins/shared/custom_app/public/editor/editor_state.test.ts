/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import {
  COALESCE_WINDOW_MS,
  MAX_HISTORY,
  createEditorState,
  editorReducer,
  type EditorAction,
  type EditorState,
} from './editor_state';

const doc = (text: string, extraChildren: unknown[] = []): AppDocument =>
  appDocumentSchema.parse({
    root: {
      type: 'stack',
      id: 'root',
      children: [{ type: 'text', id: 'a', text }, ...extraChildren],
    },
  });

const run = (state: EditorState, ...actions: EditorAction[]) =>
  actions.reduce(editorReducer, state);

const commit = (document: AppDocument, extra: Partial<EditorAction> = {}): EditorAction =>
  ({ type: 'commit', document, at: 0, ...extra } as EditorAction);

describe('editorReducer', () => {
  const first = doc('one');
  const second = doc('two');
  const third = doc('three');

  it('starts with the root selected and nothing to undo or redo', () => {
    expect(createEditorState(first)).toEqual({
      present: first,
      past: [],
      future: [],
      selectedId: 'root',
    });
  });

  describe('select', () => {
    it('selects a node that exists, and ignores one that does not', () => {
      const state = createEditorState(first);

      expect(run(state, { type: 'select', id: 'a' }).selectedId).toBe('a');
      expect(run(state, { type: 'select', id: 'nope' })).toBe(state);
    });
  });

  describe('commit, undo and redo', () => {
    it('records each change as a step that can be undone and redone', () => {
      const state = run(createEditorState(first), commit(second), commit(third));

      expect(state.present).toBe(third);
      expect(state.past).toEqual([first, second]);

      const undone = run(state, { type: 'undo' });
      expect(undone.present).toBe(second);
      expect(undone.future).toEqual([third]);

      const redone = run(undone, { type: 'redo' });
      expect(redone.present).toBe(third);
      expect(redone.future).toEqual([]);
    });

    it('drops what could be redone once a new change is made', () => {
      const state = run(createEditorState(first), commit(second), { type: 'undo' }, commit(third));

      expect(state.future).toEqual([]);
      expect(state.past).toEqual([first]);
    });

    it('does nothing to undo or redo at the ends of the history', () => {
      const state = createEditorState(first);

      expect(run(state, { type: 'undo' })).toBe(state);
      expect(run(state, { type: 'redo' })).toBe(state);
    });

    it('ignores a commit of the same document, but still applies a selection', () => {
      const state = createEditorState(first);

      expect(run(state, commit(first))).toBe(state);
      expect(run(state, commit(first, { select: 'a' })).selectedId).toBe('a');
      expect(run(state, commit(first, { select: 'a' })).past).toEqual([]);
    });

    it('keeps only the most recent steps', () => {
      let state = createEditorState(first);
      for (let i = 0; i < MAX_HISTORY + 20; i++) state = run(state, commit(doc(`v${i}`)));

      expect(state.past).toHaveLength(MAX_HISTORY);
      expect(state.past[0]).toEqual(doc('v19'));
    });
  });

  describe('selection', () => {
    it('selects the node a change asks for', () => {
      const withB = doc('one', [{ type: 'text', id: 'b', text: 'b' }]);

      expect(run(createEditorState(first), commit(withB, { select: 'b' })).selectedId).toBe('b');
    });

    it('keeps the selection through a change, and falls back to the root if the node is gone', () => {
      const withB = doc('one', [{ type: 'text', id: 'b', text: 'b' }]);
      const selected = run(createEditorState(withB), { type: 'select', id: 'b' });

      expect(
        run(selected, commit(doc('one', [{ type: 'text', id: 'b', text: 'x' }]))).selectedId
      ).toBe('b');
      expect(run(selected, commit(first)).selectedId).toBe('root');
    });

    it('keeps the selection through undo if the node still exists, else selects the root', () => {
      const withB = doc('one', [{ type: 'text', id: 'b', text: 'b' }]);
      const state = run(createEditorState(first), commit(withB, { select: 'b' }));

      expect(run(state, { type: 'undo' }).selectedId).toBe('root');
      expect(run(state, { type: 'undo' }, { type: 'redo' }).selectedId).toBe('root');
    });
  });

  describe('coalescing', () => {
    const edit = (document: AppDocument, at: number, key = 'a:text') =>
      commit(document, { coalesceKey: key, at });

    it('makes a run of quick edits to one field a single step', () => {
      const state = run(
        createEditorState(first),
        edit(doc('t'), 0),
        edit(doc('ty'), 200),
        edit(doc('typ'), 400)
      );

      expect(state.present).toEqual(doc('typ'));
      expect(state.past).toEqual([first]);
      expect(run(state, { type: 'undo' }).present).toBe(first);
    });

    it('starts a new step after a pause, or when the field changes', () => {
      const paused = run(
        createEditorState(first),
        edit(doc('t'), 0),
        edit(doc('ty'), COALESCE_WINDOW_MS + 1)
      );
      expect(paused.past).toHaveLength(2);

      const otherField = run(
        createEditorState(first),
        edit(doc('t'), 0),
        edit(doc('ty'), 100, 'a:other')
      );
      expect(otherField.past).toHaveLength(2);
    });

    it('does not join an edit to a change that was not a field edit', () => {
      const state = run(
        createEditorState(first),
        edit(doc('t'), 0),
        commit(second, { at: 50 }),
        edit(doc('ty'), 100)
      );

      expect(state.past).toHaveLength(3);
    });

    it('does not carry coalescing across an undo', () => {
      const state = run(
        createEditorState(first),
        edit(doc('t'), 0),
        { type: 'undo' },
        edit(doc('u'), 100)
      );

      expect(state.past).toEqual([first]);
      expect(state.present).toEqual(doc('u'));
    });
  });
});
