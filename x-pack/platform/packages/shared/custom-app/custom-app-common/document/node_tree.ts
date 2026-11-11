/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCapability } from '@kbn/custom-app-registry';
import { OPTIONS_SOURCE_SUFFIX } from './constants';
import { isContainerNode, type Action, type AppNode, type DataSource } from './document_schema';

/** Returns the direct children of a node, empty for leaf nodes. */
export const getNodeChildren = (node: AppNode): readonly AppNode[] =>
  isContainerNode(node) ? node.children : [];

/**
 * Whether an app has nothing in it yet: a root that is a stack with no components. A new app starts
 * like this, and is shown an empty state, not a blank panel, until something is added.
 */
export const isEmptyDocument = (document: { root: AppNode }): boolean =>
  document.root.type === 'stack' && (document.root.children?.length ?? 0) === 0;

/** The props of a node whose text may contain `{{state.key}}` references. */
export const getInterpolatedText = (node: AppNode): ReadonlyArray<{ prop: string; text: string }> =>
  getCapabilityText(node);

const getCapabilityText = (node: AppNode): ReadonlyArray<{ prop: string; text: string }> => {
  const capability = getCapability(node.type);
  return [
    ...(capability?.interpolated ?? []).flatMap((prop) => {
      const text = (node as unknown as Record<string, unknown>)[prop];
      return typeof text === 'string' ? [{ prop, text }] : [];
    }),
    ...((
      capability?.extraText as
        | ((node: AppNode) => ReadonlyArray<{ prop: string; text: string }>)
        | undefined
    )?.(node) ?? []),
  ];
};

/** The ES|QL query a node runs, if it shows data. */
export const getNodeQuery = (node: AppNode): string | undefined => {
  const data = getCapability(node.type)?.data;
  return data === 'query' || data === 'query_or_source'
    ? (node as { query?: string }).query
    : undefined;
};

/** Where a node gets what it shows, if it shows data: a query, or a source of cases. */
export const getNodeSource = (node: AppNode): DataSource | undefined => {
  if (getCapability(node.type)?.data === 'query_or_source') {
    const { source } = node as { source?: DataSource };
    if (source) return source;
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
    ...Object.fromEntries(
      (
        (
          getCapability(root.type)?.sources as
            | ((node: AppNode) => ReadonlyArray<{ suffix: string; query: string }>)
            | undefined
        )?.(root) ?? []
      ).map(({ suffix, query }) => [`${root.id}${suffix}`, { type: 'esql', query }])
    ),
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
export const getNodeBindings = (node: AppNode): string[] =>
  (getCapability(node.type)?.bindings as ((node: AppNode) => string[]) | undefined)?.(node) ?? [];

/**
 * What kind of value an input sets: a list for a box of lines, and for a select that takes several
 * options, a true or a false for a switch, and text for every other.
 */
export const getBindingType = (node: AppNode): 'string' | 'list' | 'boolean' => {
  const kind = getCapability(node.type)?.bindingType;
  if (typeof kind === 'function')
    return (kind as (node: AppNode) => 'string' | 'list' | 'boolean')(node);
  return kind ?? 'string';
};

/** The actions a node can run, with the event that runs them. */
export const getNodeActions = (
  node: AppNode
): ReadonlyArray<{ event: string; actions: readonly Action[] }> => {
  const events = getCapability(node.type)?.events;
  if (events) {
    return Object.entries(events).map(([event, prop]) => ({
      event,
      actions: (node as unknown as Record<string, readonly Action[]>)[prop],
    }));
  }
  return [];
};

/** Every query in the tree, by the id of the node that runs it. */
export const collectQueries = (root: AppNode): Record<string, string> => {
  const query = getNodeQuery(root);
  return {
    ...(query === undefined ? {} : { [root.id]: query }),
    ...Object.assign({}, ...getNodeChildren(root).map(collectQueries)),
  };
};
