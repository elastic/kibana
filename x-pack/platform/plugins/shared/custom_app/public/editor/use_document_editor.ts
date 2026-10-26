/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useReducer } from 'react';
import {
  addNode,
  createNodeId,
  createStateKey,
  duplicateNode,
  findNode,
  getDocumentIssues,
  getNodeChildren,
  moveNode,
  pruneUnusedValues,
  removeNode,
  setStateDeclaration,
  updateNode,
  type AppDocument,
  type AppNode,
  type AppNodeOfType,
  type AppNodeType,
  type DocumentIssue,
  type MutationResult,
} from '@kbn/custom-app-common';
import { createEditorState, editorReducer } from './editor_state';
import { createDefaultNode } from './node_defaults';

export interface DocumentEditor {
  document: AppDocument;
  selectedId: string;
  selectedNode: AppNode;
  issues: readonly DocumentIssue[];
  canUndo: boolean;
  canRedo: boolean;
  /** Whether the document differs from the one the editor started with. */
  isDirty: boolean;
  select: (id: string) => void;
  /** Adds a node to a container; by default the selected one, or the one the selection is in. */
  add: (type: AppNodeType, parentId?: string) => MutationResult;
  removeSelected: () => MutationResult;
  duplicateSelected: () => MutationResult;
  moveSelected: (direction: 'up' | 'down') => MutationResult;
  update: <T extends AppNodeType>(
    id: string,
    props: Partial<Omit<AppNodeOfType<T>, 'id' | 'type' | 'children'>>
  ) => MutationResult;
  /** Replaces the document with an edited copy, for edits to the values. */
  edit: (change: (document: AppDocument) => AppDocument, coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;
}

const ok = (document: AppDocument): MutationResult => ({ ok: true, document });

/** The container a new node should go in: the selection if it can hold nodes, else its parent. */
const defaultParentId = (document: AppDocument, selectedId: string): string => {
  const location = findNode(document.root, selectedId);
  if (!location) return document.root.id;
  const isContainer = location.node.type === 'stack' || location.node.type === 'flyout';
  return isContainer ? location.node.id : location.parent?.id ?? document.root.id;
};

export const useDocumentEditor = (initial: AppDocument): DocumentEditor => {
  const [state, dispatch] = useReducer(editorReducer, initial, createEditorState);
  const { present: document, selectedId } = state;

  const issues = useMemo(() => getDocumentIssues(document), [document]);
  const selectedNode = (findNode(document.root, selectedId) ?? { node: document.root }).node;

  const commit = useCallback(
    (result: MutationResult, select?: string, coalesceKey?: string): MutationResult => {
      if (result.ok) {
        dispatch({
          type: 'commit',
          // A value exists because something sets it, so it goes when that does.
          document: pruneUnusedValues(result.document),
          select,
          coalesceKey,
          at: Date.now(),
        });
      }
      return result;
    },
    []
  );

  return {
    document,
    selectedId,
    selectedNode,
    issues,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    isDirty: document !== initial,

    select: (id) => dispatch({ type: 'select', id }),

    add: (type, parentId = defaultParentId(document, selectedId)) => {
      const id = createNodeId(document, type);
      const probe = createDefaultNode(type, id, { valueKey: '' });
      if (!probe) return { ok: false, reason: `Nothing to start a "${type}" from` };
      if (
        probe.type !== 'select' &&
        probe.type !== 'button_group' &&
        probe.type !== 'search' &&
        probe.type !== 'list_input' &&
        probe.type !== 'form'
      ) {
        return commit(addNode(document, parentId, probe), id);
      }

      // An input sets a value, which is made with it and named after what it is called.
      const valueKey = createStateKey(
        document,
        probe.type === 'form' ? probe.fields[0].label : probe.label
      );
      const node = createDefaultNode(type, id, { valueKey });
      if (!node) return { ok: false, reason: `Nothing to start a "${type}" from` };
      const startsAs = 'options' in node ? node.options[0]?.value ?? '' : '';
      const withValue = setStateDeclaration(
        document,
        valueKey,
        // A box of lines sets a list, which starts empty; every other input sets a text.
        node.type === 'list_input'
          ? { type: 'list', default: [] }
          : { type: 'string', default: startsAs }
      );
      return commit(addNode(withValue, parentId, node), id);
    },

    removeSelected: () => {
      const parent = findNode(document.root, selectedId)?.parent;
      return commit(removeNode(document, selectedId), parent?.id);
    },

    duplicateSelected: () => {
      const result = duplicateNode(document, selectedId);
      if (!result.ok) return result;
      const location = findNode(document.root, selectedId);
      const copy =
        location?.parent &&
        getNodeChildren(findNode(result.document.root, location.parent.id)!.node)[
          location.index + 1
        ];
      return commit(result, copy?.id);
    },

    moveSelected: (direction) => {
      const location = findNode(document.root, selectedId);
      if (!location?.parent) return { ok: false, reason: 'The root cannot be moved' };

      const index = location.index + (direction === 'up' ? -1 : 1);
      const siblings = getNodeChildren(location.parent).length;
      if (index < 0 || index >= siblings) {
        return ok(document);
      }
      return commit(moveNode(document, selectedId, location.parent.id, index));
    },

    update: (id, props) =>
      commit(updateNode(document, id, props), undefined, `${id}:${Object.keys(props).join(',')}`),

    edit: (change, coalesceKey) => commit(ok(change(document)), undefined, coalesceKey),

    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
  };
};
