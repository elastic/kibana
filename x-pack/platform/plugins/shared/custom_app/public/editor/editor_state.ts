/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findNode, type AppDocument } from '@kbn/custom-app-common';

/** How many steps can be undone. */
export const MAX_HISTORY = 100;
/** Edits to the same field closer together than this count as one step. */
export const COALESCE_WINDOW_MS = 1_000;

export interface EditorState {
  present: AppDocument;
  past: readonly AppDocument[];
  future: readonly AppDocument[];
  selectedId: string;
  /** What the last edit was, so a run of edits to one field can be one step. */
  lastEdit?: { key: string; at: number };
}

export type EditorAction =
  | { type: 'select'; id: string }
  | {
      type: 'commit';
      document: AppDocument;
      /** The node to select afterwards; the selection stays if it still exists. */
      select?: string;
      /** Edits with the same key in quick succession are undone together. */
      coalesceKey?: string;
      at: number;
    }
  | { type: 'undo' }
  | { type: 'redo' };

export const createEditorState = (document: AppDocument): EditorState => ({
  present: document,
  past: [],
  future: [],
  selectedId: document.root.id,
});

/** Keeps a selection if the node is still there, and otherwise falls back to the root. */
const resolveSelection = (document: AppDocument, id: string): string =>
  findNode(document.root, id) ? id : document.root.id;

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'select':
      return findNode(state.present.root, action.id) ? { ...state, selectedId: action.id } : state;

    case 'commit': {
      if (action.document === state.present) {
        return action.select
          ? { ...state, selectedId: resolveSelection(state.present, action.select) }
          : state;
      }

      const selectedId = resolveSelection(action.document, action.select ?? state.selectedId);
      const continuesLastEdit =
        action.coalesceKey !== undefined &&
        state.lastEdit?.key === action.coalesceKey &&
        action.at - state.lastEdit.at < COALESCE_WINDOW_MS;
      const lastEdit =
        action.coalesceKey === undefined ? undefined : { key: action.coalesceKey, at: action.at };

      return {
        present: action.document,
        past: continuesLastEdit ? state.past : [...state.past, state.present].slice(-MAX_HISTORY),
        future: [],
        selectedId,
        lastEdit,
      };
    }

    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        present: previous,
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future],
        selectedId: resolveSelection(previous, state.selectedId),
      };
    }

    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        present: next,
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        future: rest,
        selectedId: resolveSelection(next, state.selectedId),
      };
    }
  }
};
