/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPTIONS_SOURCE_SUFFIX } from './constants';
import type { Action, AppNode, DataSource } from './document_schema';

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

/** Where a node gets what it shows, if it shows data: a query, or a source of cases. */
export const getNodeSource = (node: AppNode): DataSource | undefined => {
  if (node.type === 'stat' || node.type === 'table' || node.type === 'key_value') {
    if (node.source) return node.source;
  }
  const query = getNodeQuery(node);
  return query === undefined ? undefined : { type: 'esql', query };
};

/** The id the source of the options of a select is known by, which is not that of a component. */
export const getOptionsSourceId = (nodeId: string): string => `${nodeId}${OPTIONS_SOURCE_SUFFIX}`;

/** Every source in the tree, by the id of the node that shows it, and of the options of a select. */
export const collectSources = (root: AppNode): Record<string, DataSource> => {
  const source = getNodeSource(root);
  return {
    ...(source === undefined ? {} : { [root.id]: source }),
    ...(root.type === 'select' && root.optionsQuery !== undefined
      ? { [getOptionsSourceId(root.id)]: { type: 'esql', query: root.optionsQuery } }
      : {}),
    ...Object.assign({}, ...getNodeChildren(root).map(collectSources)),
  };
};

/** The values of the app that a source is driven by, which are the ones that make it run again. */
export const getSourceStateKeys = (source: DataSource): string[] => {
  if (source.type !== 'cases') return [];
  return [source.status, source.severity, source.search, source.tag].flatMap((filter) =>
    typeof filter === 'object' ? [filter.fromState] : []
  );
};

/** The state keys an input node reads and writes: one for an input, one for each field of a form. */
export const getNodeBindings = (node: AppNode): string[] => {
  switch (node.type) {
    case 'select':
    case 'button_group':
    case 'search':
      return [node.bind];
    case 'form':
      return node.fields.map(({ bind }) => bind);
    default:
      return [];
  }
};

/** The actions a node can run, with the event that runs them. */
export const getNodeActions = (
  node: AppNode
): ReadonlyArray<{ event: string; actions: readonly Action[] }> => {
  switch (node.type) {
    case 'table':
      return [{ event: 'onRowClick', actions: node.onRowClick }];
    case 'button':
      return [{ event: 'onClick', actions: node.onClick }];
    case 'form':
      return [{ event: 'onSubmit', actions: node.onSubmit }];
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
