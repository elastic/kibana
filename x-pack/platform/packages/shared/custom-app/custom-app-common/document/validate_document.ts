/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import {
  getAction,
  getCapability,
  type ActionValidationContext,
  type CapabilityValidationContext,
} from '@kbn/custom-app-registry';
import {
  CASES_FILTERS,
  CASES_SEVERITIES,
  CASES_STATUSES,
  MAX_NODE_COUNT,
  MAX_NODE_DEPTH,
  MAX_STATE_KEYS,
} from './constants';
import type { AppNode, AppTheme, StateDeclaration } from './document_schema';
import { THEME_BOUND_PROPS, getBoundProps, getPath, isStateRef, type StateRef } from './bindings';
import { findStateReferences, hasMalformedReference } from './interpolation';
import {
  getInterpolatedText,
  getNodeActions,
  getBindingType,
  getNodeBindings,
  getNodeChildren,
  getNodeSource,
  getSourceStateKeys,
} from './node_tree';

interface DocumentToValidate {
  state: Record<string, StateDeclaration>;
  root: AppNode;
  theme?: AppTheme;
}

/** Where each action's `fromColumn` and `fromInput` values make sense. */
const ACTION_VALUE_SOURCES: Record<string, { fromColumn: boolean; fromInput: boolean }> = {
  onRowClick: { fromColumn: true, fromInput: false },
  onChartClick: { fromColumn: true, fromInput: false },
  onChange: { fromColumn: false, fromInput: true },
  onClick: { fromColumn: false, fromInput: false },
  onSubmit: { fromColumn: false, fromInput: false },
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

  /** What is wrong with a property that reads a value, and the value it starts as. */
  const checkReference = (
    subject: string,
    property: string,
    ref: StateRef,
    bound: { schema: z.ZodType; kind: 'string' | 'number' | 'boolean' },
    nodeId?: string
  ) => {
    const declaration = state[ref.$state];
    if (!declaration) {
      issue(`${subject} reads "${property}" from unknown state key "${ref.$state}"`, nodeId);
    } else if (declaration.type !== bound.kind) {
      issue(
        `${subject} reads "${property}" from state key "${ref.$state}" (${declaration.type}); it needs a ${bound.kind} key`,
        nodeId
      );
    } else if (!bound.schema.safeParse(declaration.default).success) {
      issue(
        `${subject} reads "${property}" from state key "${
          ref.$state
        }", whose default ${JSON.stringify(
          declaration.default
        )} is not a value "${property}" can have`,
        nodeId
      );
    }
  };

  Object.entries(THEME_BOUND_PROPS).forEach(([property, bound]) => {
    const value = (document.theme as Record<string, unknown> | undefined)?.[property];
    if (isStateRef(value)) checkReference('The theme', property, value, bound);
  });

  const flyoutIds = new Set(
    nodes.filter(({ type }) => getCapability(type)?.overlay === true).map(({ id }) => id)
  );

  nodes.forEach((node) => {
    const bindings = getNodeBindings(node);
    const wanted = getBindingType(node);
    bindings.forEach((binding) => {
      const declaration = state[binding];
      if (binding === '') {
        // Reported as too short.
      } else if (!declaration) {
        issue(`Node "${node.id}" binds unknown state key "${binding}"`, node.id);
      } else if (declaration.type !== wanted) {
        issue(
          `Node "${node.id}" binds state key "${binding}" (${declaration.type}); ${
            wanted === 'list'
              ? 'this input sets a list and needs a list key'
              : wanted === 'boolean'
              ? 'a switch sets a true or a false and needs a boolean key'
              : 'an input needs a string key'
          }`,
          node.id
        );
      }
    });

    Object.entries(getBoundProps(node.type) ?? {}).forEach(([path, bound]) => {
      const value = getPath(node, path);
      if (isStateRef(value)) {
        checkReference(`Node "${node.id}"`, path, value, bound, node.id);
      }
    });

    if (node.visibleWhen) {
      const { $state: key, equals } = node.visibleWhen;
      const declaration = state[key];
      if (!declaration) {
        issue(`Node "${node.id}" is shown by unknown state key "${key}"`, node.id);
      } else if (declaration.type === 'list') {
        issue(`Node "${node.id}" is shown by state key "${key}", which is a list`, node.id);
      } else if (equals === undefined && declaration.type !== 'boolean') {
        issue(
          `Node "${node.id}" is shown by state key "${key}" (${declaration.type}); without "equals" it needs a boolean key`,
          node.id
        );
      } else if (equals !== undefined && typeof equals !== declaration.type) {
        issue(
          `Node "${node.id}" is shown when state key "${key}" (${
            declaration.type
          }) equals ${JSON.stringify(equals)}, which is a ${typeof equals}`,
          node.id
        );
      }
    }

    if (getCapability(node.type)?.data === 'query_or_source') {
      const shown = node as { query?: string; source?: unknown };
      if ((shown.query === undefined) === (shown.source === undefined)) {
        issue(
          `Node "${node.id}" shows data and needs a query or a source, and one of them only`,
          node.id
        );
      }
    }

    const source = getNodeSource(node);
    if (source?.type === 'cases') {
      getSourceStateKeys(source)
        .filter((key) => !(key in state))
        .forEach((key) =>
          issue(`Node "${node.id}" filters cases by the unknown state key "${key}"`, node.id)
        );

      const allowed = { status: CASES_STATUSES, severity: CASES_SEVERITIES } as const;
      CASES_FILTERS.forEach((filter) => {
        const value = source[filter];
        const known: readonly string[] | undefined =
          filter in allowed ? allowed[filter as keyof typeof allowed] : undefined;
        // An empty value filters nothing, which an "All" option of a select says.
        if (known && typeof value === 'string' && value !== '' && !known.includes(value)) {
          issue(
            `Node "${node.id}" filters cases by the ${filter} "${value}"; it is one of ${known.join(
              ', '
            )}`,
            node.id
          );
        }
      });
    }

    (
      getCapability(node.type)?.validate as
        | ((node: AppNode, context: CapabilityValidationContext) => void)
        | undefined
    )?.(node, {
      nodes,
      sourceOf: (nodeId) => {
        const target = nodes.find(({ id }) => id === nodeId);
        return target ? getNodeSource(target) : undefined;
      },
      parentOf: (nodeId) =>
        nodes.find((candidate) => getNodeChildren(candidate).some(({ id }) => id === nodeId)),
      issue: (message) => issue(message, node.id),
    });

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
        (
          getAction(action.type)?.validate as
            | ((action: unknown, context: ActionValidationContext) => void)
            | undefined
        )?.(action, {
          nodeId: node.id,
          event,
          allowed,
          state,
          overlayIds: flyoutIds,
          issue: (message) => issue(message, node.id),
        });
      });
    });
  });
};
