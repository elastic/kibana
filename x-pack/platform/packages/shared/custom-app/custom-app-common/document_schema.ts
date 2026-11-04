/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { CUSTOM_APP_STATE_VERSION } from './constants';
import { bindable, stateKeySchema, themeAccentSchema, themeShapeSchema } from './bindings';
import { registerBuiltinCapabilities, type BuiltinNode } from './capabilities/builtin';
import { getCapability } from './capabilities/capability_registry';
import { nodeSchema as anyNodeSchema } from './node_schema';
import { actionSchema, stateDeclarationSchema } from './action_schemas';
import type { casesSourceSchema } from './data_fields';
import type { formFieldSchema } from './input_schemas';
import { validateDocument } from './validate_document';

registerBuiltinCapabilities();

export { stateKeySchema, actionSchema, stateDeclarationSchema };
export { getNodeSchemas } from './node_schema';

/** The schema of a node of any type. */
export const nodeSchema = anyNodeSchema as z.ZodType<AppNode>;

/** A node of any type: it is the union of what the capabilities define. */
export type AppNode = BuiltinNode;
/** The nodes that hold other nodes. */
export type ContainerNode = Extract<AppNode, { children: unknown }>;
export type AppNodeType = AppNode['type'];
export type AppNodeOfType<T extends AppNodeType> = Extract<AppNode, { type: T }>;
export type Action = z.output<typeof actionSchema>;
export type FormField = z.output<typeof formFieldSchema>;
export type CasesSource = z.output<typeof casesSourceSchema>;
/** Where a component gets what it shows. */
export type DataSource = { type: 'esql'; query: string } | CasesSource;

/**
 * How a page looks, as a choice from a short list and not as colours and sizes to set. It changes
 * every component at once: the accent is the colour of what can be pressed and followed, and the
 * shape is how round the corners are. A page with none looks as Kibana does.
 */
export const themeSchema = lazySchema(() =>
  z.object({
    accent: bindable(themeAccentSchema),
    shape: bindable(themeShapeSchema),
  })
);

export const appDocumentShapeSchema = lazySchema(() =>
  z.object({
    state: z.record(stateKeySchema, stateDeclarationSchema).default({}),
    root: nodeSchema,
    theme: themeSchema.optional(),
  })
);

export const appDocumentSchema = lazySchema(() =>
  appDocumentShapeSchema.superRefine(validateDocument)
);

export type StateDeclaration = z.output<typeof stateDeclarationSchema>;
export type AppTheme = z.output<typeof themeSchema>;
export type AppDocument = z.output<typeof appDocumentSchema>;

/** The panel's own state, without the titles and time range every panel shares. */
export const customAppStateSchema = lazySchema(() =>
  z.object({
    version: z.literal(CUSTOM_APP_STATE_VERSION),
    document: appDocumentSchema,
  })
);

export type CustomAppState = z.output<typeof customAppStateSchema>;

/** Whether a node holds other nodes. */
export const isContainerNode = (node: AppNode): node is ContainerNode =>
  getCapability(node.type)?.container === true;

/** Returns the direct children of a node, empty for leaf nodes. */
export const getNodeChildren = (node: AppNode): readonly AppNode[] =>
  isContainerNode(node) ? node.children : [];
