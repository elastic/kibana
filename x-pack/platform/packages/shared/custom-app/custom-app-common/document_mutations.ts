/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isContainerNode,
  type Action,
  type AppDocument,
  type AppNode,
  type AppNodeOfType,
  type AppNodeType,
  type ContainerNode,
  type StateDeclaration,
} from './document_schema';
import {
  getNodeActions,
  getNodeBindings,
  getNodeChildren,
  getNodeSource,
  getSourceStateKeys,
} from './node_tree';

/**
 * Edits to a document, as pure functions. Each returns a new document and leaves its input alone.
 * They keep the tree well formed; whether the result is a valid document, with every reference
 * resolving, is for `appDocumentSchema` to say, so an author can pass through invalid states
 * while editing.
 */

export type MutationResult = { ok: true; document: AppDocument } | { ok: false; reason: string };

export interface NodeLocation {
  node: AppNode;
  /** Absent for the root. */
  parent?: AppNode;
  /** The position among the parent's children. */
  index: number;
}

const ok = (document: AppDocument): MutationResult => ({ ok: true, document });
const fail = (reason: string): MutationResult => ({ ok: false, reason });

const isContainer = isContainerNode;

export const findNode = (root: AppNode, id: string): NodeLocation | undefined => {
  if (root.id === id) return { node: root, index: 0 };

  const pending: AppNode[] = [root];
  for (let parent = pending.pop(); parent; parent = pending.pop()) {
    const children = getNodeChildren(parent);
    const index = children.findIndex((child) => child.id === id);
    if (index !== -1) return { node: children[index], parent, index };
    pending.push(...children);
  }
  return undefined;
};

const collectIds = (root: AppNode): Set<string> => {
  const ids = new Set<string>();
  const pending: AppNode[] = [root];
  for (let node = pending.pop(); node; node = pending.pop()) {
    ids.add(node.id);
    pending.push(...getNodeChildren(node));
  }
  return ids;
};

/** The first id of the form `<type>-<n>` that no node in the document uses. */
export const createNodeId = (
  document: AppDocument,
  type: AppNodeType,
  alsoTaken: ReadonlySet<string> = new Set()
): string => {
  const taken = collectIds(document.root);
  let n = 1;
  while (taken.has(`${type}-${n}`) || alsoTaken.has(`${type}-${n}`)) n++;
  return `${type}-${n}`;
};

/** Rebuilds the tree with the node of the given id replaced by what `replace` returns. */
const mapNode = (
  node: AppNode,
  id: string,
  replace: (found: AppNode) => AppNode | undefined
): AppNode | undefined => {
  if (node.id === id) return replace(node);
  if (!isContainer(node)) return node;

  const container = node as ContainerNode;
  return {
    ...container,
    children: container.children.flatMap((child) => mapNode(child, id, replace) ?? []),
  };
};

const withRoot = (document: AppDocument, root: AppNode): AppDocument => ({ ...document, root });

const insertChild = (parent: ContainerNode, node: AppNode, index: number | undefined): AppNode => {
  const at =
    index === undefined
      ? parent.children.length
      : Math.max(0, Math.min(index, parent.children.length));
  return {
    ...parent,
    children: [...parent.children.slice(0, at), node, ...parent.children.slice(at)],
  };
};

/** Adds a node to a container, at the end unless an index is given. */
export const addNode = (
  document: AppDocument,
  parentId: string,
  node: AppNode,
  index?: number
): MutationResult => {
  const parent = findNode(document.root, parentId);
  if (!parent) return fail(`There is no node "${parentId}"`);
  if (!isContainer(parent.node)) return fail(`"${parentId}" cannot hold other nodes`);
  if (findNode(document.root, node.id)) return fail(`There is already a node "${node.id}"`);

  const root = mapNode(document.root, parentId, (found) =>
    insertChild(found as ContainerNode, node, index)
  );
  return root ? ok(withRoot(document, root)) : fail(`There is no node "${parentId}"`);
};

const dropActionsOpening = (node: AppNode, removed: ReadonlySet<string>): AppNode => {
  const keep = (actions: readonly Action[]) =>
    actions.filter((action) => !(action.type === 'openFlyout' && removed.has(action.flyout)));

  switch (node.type) {
    case 'table':
      return { ...node, onRowClick: keep(node.onRowClick) };
    case 'select':
    case 'button_group':
    case 'search':
      return { ...node, onChange: keep(node.onChange) };
    default:
      return isContainerNode(node)
        ? {
            ...node,
            children: node.children.map((child) => dropActionsOpening(child, removed)),
          }
        : node;
  }
};

/**
 * Removes a node and everything under it. Actions that opened a flyout that went with it are
 * removed too, so deleting a flyout does not leave the rest of the document broken.
 */
export const removeNode = (document: AppDocument, id: string): MutationResult => {
  if (document.root.id === id) return fail('The root cannot be removed');
  const location = findNode(document.root, id);
  if (!location) return fail(`There is no node "${id}"`);

  const removed = collectIds(location.node);
  const root = mapNode(document.root, id, () => undefined);
  return root
    ? ok(withRoot(document, dropActionsOpening(root, removed)))
    : fail('The root cannot be removed');
};

/**
 * Moves a node into a container at the given position, counted among that container's children
 * once the node has been taken out of it. Moving within a container reorders it.
 */
export const moveNode = (
  document: AppDocument,
  id: string,
  parentId: string,
  index: number
): MutationResult => {
  if (document.root.id === id) return fail('The root cannot be moved');
  const moving = findNode(document.root, id);
  if (!moving) return fail(`There is no node "${id}"`);
  if (collectIds(moving.node).has(parentId)) return fail('A node cannot be moved into itself');

  const target = findNode(document.root, parentId);
  if (!target) return fail(`There is no node "${parentId}"`);
  if (!isContainer(target.node)) return fail(`"${parentId}" cannot hold other nodes`);

  const without = mapNode(document.root, id, () => undefined);
  if (!without) return fail('The root cannot be moved');
  const root = mapNode(without, parentId, (found) =>
    insertChild(found as ContainerNode, moving.node, index)
  );
  return root ? ok(withRoot(document, root)) : fail(`There is no node "${parentId}"`);
};

const reId = (node: AppNode, document: AppDocument, taken: Set<string>): AppNode => {
  const id = createNodeId(document, node.type, taken);
  taken.add(id);
  return isContainer(node)
    ? ({
        ...node,
        id,
        children: (node as ContainerNode).children.map((child) => reId(child, document, taken)),
      } as AppNode)
    : ({ ...node, id } as AppNode);
};

/** Copies a node, with everything under it and new ids, to just after the original. */
export const duplicateNode = (document: AppDocument, id: string): MutationResult => {
  const location = findNode(document.root, id);
  if (!location) return fail(`There is no node "${id}"`);
  if (!location.parent) return fail('The root cannot be duplicated');

  const copy = reId(structuredClone(location.node), document, new Set());
  return addNode(document, location.parent.id, copy, location.index + 1);
};

type NodeProps<T extends AppNodeType> = Partial<Omit<AppNodeOfType<T>, 'id' | 'type' | 'children'>>;

/**
 * Changes properties of a node. The id, the type and the children are not properties: they
 * change through the other edits. Values are not validated, so a field can be cleared while
 * an author types a replacement.
 */
export const updateNode = <T extends AppNodeType>(
  document: AppDocument,
  id: string,
  props: NodeProps<T>
): MutationResult => {
  if (!findNode(document.root, id)) return fail(`There is no node "${id}"`);
  const root = mapNode(document.root, id, (found) => ({ ...found, ...props } as AppNode));
  return root ? ok(withRoot(document, root)) : fail(`There is no node "${id}"`);
};

/** Turns some words into a name a value can have: `Service name` gives `service_name`. */
const toKeyBase = (words: string): string => {
  const slug = words
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return slug === '' ? 'value' : /^[0-9]/.test(slug) ? `value_${slug}` : slug;
};

const uniqueKey = (document: AppDocument, base: string): string => {
  let key = base;
  for (let n = 2; key in document.state; n++) key = `${base}_${n}`;
  return key;
};

/**
 * A name for a new value, taken from some words such as an input's label. It is always a valid
 * ES|QL parameter name, and one the document does not use.
 */
export const createStateKey = (document: AppDocument, words: string): string =>
  uniqueKey(document, toKeyBase(words));

/**
 * The value that remembers a column of a clicked row, named after the column. A text value of that
 * name is reused, so two tables, or a table and an input, can share one; otherwise a new name is made.
 */
export const stateKeyForColumn = (document: AppDocument, column: string): string => {
  const base = toKeyBase(column);
  return document.state[base]?.type === 'string' ? base : uniqueKey(document, base);
};

/**
 * Removes every value that nothing sets. A value exists because an input is bound to it or an
 * action sets it, so when that goes, the value goes too and the author never has to tidy up.
 */
export const pruneUnusedValues = (document: AppDocument): AppDocument => {
  const used = new Set<string>();
  const pending: AppNode[] = [document.root];
  for (let node = pending.pop(); node; node = pending.pop()) {
    getNodeBindings(node).forEach((binding) => used.add(binding));
    // A value that filters the cases of a component is used, though nothing may query with it.
    const source = getNodeSource(node);
    if (source) getSourceStateKeys(source).forEach((key) => used.add(key));
    getNodeActions(node).forEach(({ actions }) =>
      actions.forEach((action) => {
        if (action.type === 'setState') used.add(action.key);
        if (action.type === 'runWorkflow') {
          Object.values(action.inputs).forEach((value) => {
            if (typeof value === 'object' && 'fromState' in value) used.add(value.fromState);
          });
        }
      })
    );
    pending.push(...getNodeChildren(node));
  }

  const keys = Object.keys(document.state);
  if (keys.every((key) => used.has(key))) return document;
  return {
    ...document,
    state: Object.fromEntries(
      keys.filter((key) => used.has(key)).map((key) => [key, document.state[key]])
    ),
  };
};

export const setStateDeclaration = (
  document: AppDocument,
  key: string,
  declaration: StateDeclaration
): AppDocument => ({ ...document, state: { ...document.state, [key]: declaration } });

/** Removes a state key. Whatever still refers to it is reported by validation. */
export const removeStateKey = (document: AppDocument, key: string): AppDocument => {
  const { [key]: _removed, ...state } = document.state;
  return { ...document, state };
};
