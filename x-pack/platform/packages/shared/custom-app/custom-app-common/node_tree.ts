/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANNOTATIONS_SOURCE_SUFFIX, OPTIONS_SOURCE_SUFFIX } from './constants';
import { isContainerNode, type Action, type AppNode, type DataSource } from './document_schema';

/** Returns the direct children of a node, empty for leaf nodes. */
export const getNodeChildren = (node: AppNode): readonly AppNode[] =>
  isContainerNode(node) ? node.children : [];

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
    case 'metric':
      return [{ prop: 'title', text: node.title }];
    case 'card':
      return [
        ...(node.title === undefined ? [] : [{ prop: 'title', text: node.title }]),
        ...(node.description === undefined
          ? []
          : [{ prop: 'description', text: node.description }]),
      ];
    case 'badge':
      return [{ prop: 'text', text: node.text }];
    case 'progress':
      return node.label === undefined ? [] : [{ prop: 'label', text: node.label }];
    case 'section':
      return [{ prop: 'label', text: node.label }];
    case 'chart':
      return node.title === undefined ? [] : [{ prop: 'title', text: node.title }];
    case 'link':
      return [
        { prop: 'label', text: node.label },
        ...(node.to.type === 'app' && node.to.path !== undefined
          ? [{ prop: 'path', text: node.to.path }]
          : []),
      ];
    default:
      return [];
  }
};

/** The ES|QL query a node runs, if it shows data. */
export const getNodeQuery = (node: AppNode): string | undefined =>
  node.type === 'stat' ||
  node.type === 'metric' ||
  node.type === 'progress' ||
  node.type === 'chart' ||
  node.type === 'custom_content' ||
  node.type === 'table' ||
  node.type === 'key_value'
    ? node.query
    : undefined;

/** Where a node gets what it shows, if it shows data: a query, or a source of cases. */
export const getNodeSource = (node: AppNode): DataSource | undefined => {
  if (
    node.type === 'stat' ||
    node.type === 'metric' ||
    node.type === 'progress' ||
    node.type === 'table' ||
    node.type === 'key_value'
  ) {
    if (node.source) return node.source;
  }
  const query = getNodeQuery(node);
  return query === undefined ? undefined : { type: 'esql', query };
};

/** The id the source of the options of a select is known by, which is not that of a component. */
export const getOptionsSourceId = (nodeId: string): string => `${nodeId}${OPTIONS_SOURCE_SUFFIX}`;

/** The id the source of the annotations of a chart is known by. */
export const getAnnotationsSourceId = (nodeId: string): string =>
  `${nodeId}${ANNOTATIONS_SOURCE_SUFFIX}`;

/** Every source in the tree, by the id of the node that shows it, and of the options of a select. */
export const collectSources = (root: AppNode): Record<string, DataSource> => {
  const source = getNodeSource(root);
  return {
    ...(source === undefined ? {} : { [root.id]: source }),
    ...(root.type === 'select' && root.optionsQuery !== undefined
      ? { [getOptionsSourceId(root.id)]: { type: 'esql', query: root.optionsQuery } }
      : {}),
    ...(root.type === 'chart' && root.annotations !== undefined
      ? { [getAnnotationsSourceId(root.id)]: { type: 'esql', query: root.annotations.query } }
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
    case 'switch':
    case 'search':
    case 'list_input':
      return [node.bind];
    case 'form':
      return node.fields.map(({ bind }) => bind);
    default:
      return [];
  }
};

/**
 * What kind of value an input sets: a list for a box of lines, and for a select that takes several
 * options, a true or a false for a switch, and text for every other.
 */
export const getBindingType = (node: AppNode): 'string' | 'list' | 'boolean' =>
  node.type === 'list_input' || (node.type === 'select' && node.multiple === true)
    ? 'list'
    : node.type === 'switch'
    ? 'boolean'
    : 'string';

/** The actions a node can run, with the event that runs them. */
export const getNodeActions = (
  node: AppNode
): ReadonlyArray<{ event: string; actions: readonly Action[] }> => {
  switch (node.type) {
    case 'table':
      return [{ event: 'onRowClick', actions: node.onRowClick }];
    case 'chart':
      return [{ event: 'onChartClick', actions: node.onClick }];
    case 'button':
      return [{ event: 'onClick', actions: node.onClick }];
    case 'form':
      return [{ event: 'onSubmit', actions: node.onSubmit }];
    case 'select':
    case 'button_group':
    case 'switch':
    case 'search':
    case 'list_input':
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
