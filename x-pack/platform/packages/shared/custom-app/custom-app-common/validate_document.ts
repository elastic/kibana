/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { MAX_DATA_SOURCES, MAX_NODE_COUNT, MAX_NODE_DEPTH, MAX_STATE_KEYS } from './constants';
import type { AppNode, StateDeclaration } from './document_schema';
import { findStateReferences, hasMalformedReference } from './interpolation';
import {
  getInterpolatedText,
  getNodeActions,
  getNodeBinding,
  getNodeChildren,
  getNodeSourceId,
} from './node_tree';

interface DocumentToValidate {
  state: Record<string, StateDeclaration>;
  dataSources: Record<string, unknown>;
  root: AppNode;
}

/** Where each action's `fromColumn` and `fromInput` values make sense. */
const ACTION_VALUE_SOURCES: Record<string, { fromColumn: boolean; fromInput: boolean }> = {
  onRowClick: { fromColumn: true, fromInput: false },
  onChange: { fromColumn: false, fromInput: true },
};

const collectNodes = (
  root: AppNode,
  ctx: z.RefinementCtx
): { nodes: AppNode[]; withinLimits: boolean } => {
  const nodes: AppNode[] = [];
  const seenIds = new Set<string>();
  const pending: Array<{ node: AppNode; depth: number }> = [{ node: root, depth: 1 }];

  for (let current = pending.pop(); current; current = pending.pop()) {
    const { node, depth } = current;

    if (depth > MAX_NODE_DEPTH) {
      ctx.addIssue({
        code: 'custom',
        message: `Nodes may be nested at most ${MAX_NODE_DEPTH} deep`,
      });
      return { nodes, withinLimits: false };
    }
    if (nodes.length >= MAX_NODE_COUNT) {
      ctx.addIssue({
        code: 'custom',
        message: `A document may hold at most ${MAX_NODE_COUNT} nodes`,
      });
      return { nodes, withinLimits: false };
    }

    if (seenIds.has(node.id)) {
      ctx.addIssue({ code: 'custom', message: `Duplicate node id "${node.id}"` });
    }
    seenIds.add(node.id);
    nodes.push(node);

    // Pushed in reverse so nodes are visited, and issues reported, in document order.
    [...getNodeChildren(node)]
      .reverse()
      .forEach((child) => pending.push({ node: child, depth: depth + 1 }));
  }

  return { nodes, withinLimits: true };
};

/**
 * Enforces what the node schemas cannot express: size limits, unique ids, and that everything a
 * node refers to (data sources, state keys, flyouts) exists and is used with the right type.
 * Without the bounds a single saved panel could carry an arbitrarily large tree.
 */
export const validateDocument = (document: DocumentToValidate, ctx: z.RefinementCtx): void => {
  const { state, dataSources } = document;
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });

  if (Object.keys(state).length > MAX_STATE_KEYS) {
    issue(`A document may hold at most ${MAX_STATE_KEYS} state keys`);
  }
  if (Object.keys(dataSources).length > MAX_DATA_SOURCES) {
    issue(`A document may hold at most ${MAX_DATA_SOURCES} data sources`);
  }

  const { nodes, withinLimits } = collectNodes(document.root, ctx);
  if (!withinLimits) return;

  const flyoutIds = new Set(nodes.filter(({ type }) => type === 'flyout').map(({ id }) => id));

  nodes.forEach((node) => {
    const sourceId = getNodeSourceId(node);
    if (sourceId !== undefined && !(sourceId in dataSources)) {
      issue(`Node "${node.id}" refers to unknown data source "${sourceId}"`);
    }

    const binding = getNodeBinding(node);
    if (binding !== undefined) {
      const declaration = state[binding];
      if (!declaration) {
        issue(`Node "${node.id}" binds unknown state key "${binding}"`);
      } else if (declaration.type !== 'string') {
        issue(
          `Node "${node.id}" binds state key "${binding}" (${declaration.type}); an input needs a string key`
        );
      }
    }

    if (node.type === 'select' || node.type === 'button_group') {
      const seen = new Set<string>();
      node.options.forEach(({ value }) => {
        if (seen.has(value)) issue(`Node "${node.id}" has the option "${value}" more than once`);
        seen.add(value);
      });
    }

    getInterpolatedText(node).forEach(({ prop, text }) => {
      if (hasMalformedReference(text)) {
        issue(`Node "${node.id}" has a malformed reference in "${prop}"; use {{state.<key>}}`);
      }
      findStateReferences(text)
        .filter((key) => !(key in state))
        .forEach((key) => issue(`Node "${node.id}" refers to unknown state key "${key}"`));
    });

    getNodeActions(node).forEach(({ event, actions }) => {
      const allowed = ACTION_VALUE_SOURCES[event] ?? { fromColumn: false, fromInput: false };

      actions.forEach((action) => {
        if (action.type === 'openFlyout' && !flyoutIds.has(action.flyout)) {
          issue(`Node "${node.id}" opens "${action.flyout}", which is not a flyout`);
        }
        if (action.type !== 'setState') return;

        const declaration = state[action.key];
        if (!declaration) {
          issue(`Node "${node.id}" sets unknown state key "${action.key}"`);
          return;
        }

        const { value } = action;
        if (typeof value === 'object') {
          if ('fromColumn' in value && !allowed.fromColumn) {
            issue(`Node "${node.id}": fromColumn is not valid in ${event}`);
          }
          if ('fromInput' in value && !allowed.fromInput) {
            issue(`Node "${node.id}": fromInput is only valid on input nodes`);
          }
        } else if (typeof value !== declaration.type) {
          issue(
            `Node "${node.id}" sets state key "${action.key}" (${
              declaration.type
            }) to a ${typeof value}`
          );
        }
      });
    });
  });
};
