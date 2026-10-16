/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { CUSTOM_CONTENT_SCRIPT_PATTERN } from '@kbn/custom-content-common';
import { MAX_NODE_COUNT, MAX_NODE_DEPTH, MAX_STATE_KEYS } from './constants';
import type { AppNode, StateDeclaration } from './document_schema';
import { findStateReferences, hasMalformedReference } from './interpolation';
import { getInterpolatedText, getNodeActions, getNodeBinding, getNodeChildren } from './node_tree';

interface DocumentToValidate {
  state: Record<string, StateDeclaration>;
  root: AppNode;
}

/** Where each action's `fromColumn` and `fromInput` values make sense. */
const ACTION_VALUE_SOURCES: Record<string, { fromColumn: boolean; fromInput: boolean }> = {
  onRowClick: { fromColumn: true, fromInput: false },
  onChange: { fromColumn: false, fromInput: true },
  onClick: { fromColumn: false, fromInput: false },
};

/**
 * Where an action may run a workflow: when something is pressed or a row is clicked, never when an
 * input changes, which is every key that is typed and would start a workflow for each.
 */
const WORKFLOW_EVENTS: readonly string[] = ['onClick', 'onRowClick'];

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
      ctx.addIssue({
        code: 'custom',
        message: `Duplicate node id "${node.id}"`,
        params: { nodeId: node.id },
      });
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
 * node refers to (state keys, flyouts) exists and is used with the right type.
 * Without the bounds a single saved panel could carry an arbitrarily large tree.
 */
export const validateDocument = (document: DocumentToValidate, ctx: z.RefinementCtx): void => {
  const { state } = document;
  const issue = (message: string, nodeId?: string) =>
    ctx.addIssue({
      code: 'custom',
      message,
      ...(nodeId === undefined ? {} : { params: { nodeId } }),
    });

  if (Object.keys(state).length > MAX_STATE_KEYS) {
    issue(`A document may hold at most ${MAX_STATE_KEYS} state keys`);
  }
  const { nodes, withinLimits } = collectNodes(document.root, ctx);
  if (!withinLimits) return;

  const firstTimeRangeId = nodes.find(({ type }) => type === 'time_range')?.id;
  const flyoutIds = new Set(nodes.filter(({ type }) => type === 'flyout').map(({ id }) => id));

  nodes.forEach((node) => {
    const binding = getNodeBinding(node);
    if (binding !== undefined) {
      const declaration = state[binding];
      if (binding === '') {
        // Reported as too short.
      } else if (!declaration) {
        issue(`Node "${node.id}" binds unknown state key "${binding}"`, node.id);
      } else if (declaration.type !== 'string') {
        issue(
          `Node "${node.id}" binds state key "${binding}" (${declaration.type}); an input needs a string key`,
          node.id
        );
      }
    }

    if (node.type === 'time_range' && node.id !== firstTimeRangeId) {
      issue(
        `Node "${node.id}" is a second time range; an app has one, which sets the period of all of it`,
        node.id
      );
    }

    if (node.type === 'custom_content') {
      if (!node.template?.trim()) {
        issue(
          `Node "${node.id}" has no template; describe what it should show in its "prompt"`,
          node.id
        );
      } else if (CUSTOM_CONTENT_SCRIPT_PATTERN.test(node.template)) {
        issue(
          `Node "${node.id}" has a template with a script in it; it is shown with scripting off, so write it as plain HTML`,
          node.id
        );
      }
    }

    if (node.type === 'select' || node.type === 'button_group') {
      const seen = new Set<string>();
      node.options.forEach(({ value }) => {
        if (seen.has(value)) {
          issue(`Node "${node.id}" has the option "${value}" more than once`, node.id);
        }
        seen.add(value);
      });
    }

    getInterpolatedText(node).forEach(({ prop, text }) => {
      if (hasMalformedReference(text)) {
        issue(
          `Node "${node.id}" has a malformed reference in "${prop}"; use {{state.<key>}}`,
          node.id
        );
      }
      findStateReferences(text)
        .filter((key) => !(key in state))
        .forEach((key) => issue(`Node "${node.id}" refers to unknown state key "${key}"`, node.id));
    });

    getNodeActions(node).forEach(({ event, actions }) => {
      const allowed = ACTION_VALUE_SOURCES[event] ?? { fromColumn: false, fromInput: false };

      actions.forEach((action) => {
        if (action.type === 'runWorkflow') {
          if (!WORKFLOW_EVENTS.includes(event)) {
            issue(
              `Node "${node.id}" runs a workflow on ${event}; a workflow can only be run by a button or a row click`,
              node.id
            );
          }
          Object.entries(action.inputs).forEach(([name, value]) => {
            if (typeof value !== 'object') return;
            if ('fromColumn' in value && !allowed.fromColumn) {
              issue(
                `Node "${node.id}": the input "${name}" of the workflow takes a column, which only a row click has`,
                node.id
              );
            }
            if ('fromState' in value && !(value.fromState in state)) {
              issue(
                `Node "${node.id}": the input "${name}" of the workflow takes the unknown state key "${value.fromState}"`,
                node.id
              );
            }
          });
          return;
        }
        if (action.type === 'openFlyout' && !flyoutIds.has(action.flyout)) {
          issue(`Node "${node.id}" opens "${action.flyout}", which is not a flyout`, node.id);
        }
        if (action.type !== 'setState') return;

        const declaration = state[action.key];
        if (!declaration) {
          issue(`Node "${node.id}" sets unknown state key "${action.key}"`, node.id);
          return;
        }

        const { value } = action;
        if (typeof value === 'object') {
          if ('fromColumn' in value && !allowed.fromColumn) {
            issue(`Node "${node.id}": fromColumn is not valid in ${event}`, node.id);
          }
          if ('fromInput' in value && !allowed.fromInput) {
            issue(`Node "${node.id}": fromInput is only valid on input nodes`, node.id);
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
