/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  CUSTOM_APP_STATE_VERSION,
  MAX_CHILDREN_PER_NODE,
  MAX_HEADING_LENGTH,
  MAX_NODE_COUNT,
  MAX_NODE_DEPTH,
  MAX_NODE_ID_LENGTH,
  MAX_TEXT_LENGTH,
} from './constants';

const nodeIdSchema = z
  .string()
  .min(1)
  .max(MAX_NODE_ID_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/);

const spacingSchema = z.enum(['s', 'm', 'l']);

const headingNodeSchema = z.object({
  type: z.literal('heading'),
  id: nodeIdSchema,
  text: z.string().max(MAX_HEADING_LENGTH),
  size: spacingSchema.default('m'),
});

const textNodeSchema = z.object({
  type: z.literal('text'),
  id: nodeIdSchema,
  text: z.string().max(MAX_TEXT_LENGTH),
});

const calloutNodeSchema = z.object({
  type: z.literal('callout'),
  id: nodeIdSchema,
  title: z.string().max(MAX_HEADING_LENGTH),
  text: z.string().max(MAX_TEXT_LENGTH).optional(),
  color: z.enum(['primary', 'success', 'warning', 'danger']).default('primary'),
});

const stackFields = {
  type: z.literal('stack'),
  id: nodeIdSchema,
  direction: z.enum(['vertical', 'horizontal']).default('vertical'),
  gap: spacingSchema.default('m'),
};

type LeafNode =
  | z.output<typeof headingNodeSchema>
  | z.output<typeof textNodeSchema>
  | z.output<typeof calloutNodeSchema>;

type StackNode = z.output<z.ZodObject<typeof stackFields>> & { children: AppNode[] };

/**
 * Written out by hand because TypeScript cannot infer a union that contains itself. The
 * \`satisfies\` on \`nodeSchema\` fails to compile if the schemas stop producing this type.
 */
export type AppNode = LeafNode | StackNode;
export type AppNodeType = AppNode['type'];
export type AppNodeOfType<T extends AppNodeType> = Extract<AppNode, { type: T }>;

const stackNodeSchema = z.object({
  ...stackFields,
  get children(): z.ZodArray<z.ZodType<AppNode>> {
    return z.array(nodeSchema).max(MAX_CHILDREN_PER_NODE);
  },
});

export const nodeSchema = z.discriminatedUnion('type', [
  headingNodeSchema,
  textNodeSchema,
  calloutNodeSchema,
  stackNodeSchema,
]) satisfies z.ZodType<AppNode>;

/** Returns the direct children of a node, empty for leaf nodes. */
export const getNodeChildren = (node: AppNode): readonly AppNode[] =>
  node.type === 'stack' ? node.children : [];

/**
 * Enforces what a recursive schema cannot express: total size, depth and unique ids. Without
 * these bounds a single saved panel could carry an arbitrarily large tree.
 */
const validateDocumentBounds = (document: { root: AppNode }, ctx: z.RefinementCtx): void => {
  const seenIds = new Set<string>();
  let nodeCount = 0;
  const pending: Array<{ node: AppNode; depth: number }> = [{ node: document.root, depth: 1 }];

  for (let current = pending.pop(); current; current = pending.pop()) {
    const { node, depth } = current;
    nodeCount++;

    if (seenIds.has(node.id)) {
      ctx.addIssue({ code: 'custom', message: `Duplicate node id "${node.id}"` });
    }
    seenIds.add(node.id);

    if (depth > MAX_NODE_DEPTH) {
      ctx.addIssue({
        code: 'custom',
        message: `Nodes may be nested at most ${MAX_NODE_DEPTH} deep`,
      });
      return;
    }
    if (nodeCount > MAX_NODE_COUNT) {
      ctx.addIssue({
        code: 'custom',
        message: `A document may hold at most ${MAX_NODE_COUNT} nodes`,
      });
      return;
    }

    getNodeChildren(node).forEach((child) => pending.push({ node: child, depth: depth + 1 }));
  }
};

export const appDocumentSchema = z.object({ root: nodeSchema }).superRefine(validateDocumentBounds);

export type AppDocument = z.output<typeof appDocumentSchema>;

/** The panel's own state, without the titles and time range every panel shares. */
export const customAppStateSchema = z.object({
  version: z.literal(CUSTOM_APP_STATE_VERSION),
  document: appDocumentSchema,
});

export type CustomAppState = z.output<typeof customAppStateSchema>;
