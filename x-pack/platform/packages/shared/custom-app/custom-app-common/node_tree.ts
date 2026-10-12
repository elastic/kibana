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
    default:
      return [];
  }
};

/** The data source a node reads, if any. */
export const getNodeSourceId = (node: AppNode): string | undefined =>
  node.type === 'stat' || node.type === 'table' || node.type === 'key_value'
    ? node.source
    : undefined;

/** The actions a node can run, with the event that runs them. */
export const getNodeActions = (
  node: AppNode
): ReadonlyArray<{ event: string; actions: readonly Action[] }> =>
  node.type === 'table' ? [{ event: 'onRowClick', actions: node.onRowClick }] : [];
