/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, AppNode } from './document_schema';

/** Returns the direct children of a node, empty for leaf nodes. */
export const getNodeChildren = (node: AppNode): readonly AppNode[] =>
  node.type === 'stack' || node.type === 'flyout' ? node.children : [];

/**
 * Whether an app has nothing in it yet: a root that is a stack with no components. A new app starts
 * like this, and is shown an empty state, not a blank panel, until something is added.
 */
export const isEmptyDocument = (document: { root: AppNode }): boolean =>
  document.root.type === 'stack' && document.root.children.length === 0;

/** The props of a node whose text may contain `{{state.key}}` references. */
export const getInterpolatedText = (
  node: AppNode
): ReadonlyArray<{ prop: string; text: string }> => {
  switch (node.type) {
    case 'heading':
    case 'text':
      return [{ prop: 'text', text: node.text }];
    case 'callout':
      return [
        { prop: 'title', text: node.title },
        ...(node.text === undefined ? [] : [{ prop: 'text', text: node.text }]),
      ];
    case 'stat':
    case 'flyout':
      return [{ prop: 'title', text: node.title }];
    case 'chart':
      return node.title === undefined ? [] : [{ prop: 'title', text: node.title }];
    default:
      return [];
  }
};

/** The ES|QL query a node runs, if it shows data. */
export const getNodeQuery = (node: AppNode): string | undefined =>
  node.type === 'stat' ||
  node.type === 'chart' ||
  node.type === 'custom_content' ||
  node.type === 'table' ||
  node.type === 'key_value'
    ? node.query
    : undefined;

/** The state key an input node reads and writes, if it is one. */
export const getNodeBinding = (node: AppNode): string | undefined =>
  node.type === 'select' || node.type === 'button_group' || node.type === 'search'
    ? node.bind
    : undefined;

/** The actions a node can run, with the event that runs them. */
export const getNodeActions = (
  node: AppNode
): ReadonlyArray<{ event: string; actions: readonly Action[] }> => {
  switch (node.type) {
    case 'table':
      return [{ event: 'onRowClick', actions: node.onRowClick }];
    case 'select':
    case 'button_group':
    case 'search':
      return [{ event: 'onChange', actions: node.onChange }];
    default:
      return [];
  }
};

/** Every query in the tree, by the id of the node that runs it. */
export const collectQueries = (root: AppNode): Record<string, string> => {
  const query = getNodeQuery(root);
  return {
    ...(query === undefined ? {} : { [root.id]: query }),
    ...Object.assign({}, ...getNodeChildren(root).map(collectQueries)),
  };
};
