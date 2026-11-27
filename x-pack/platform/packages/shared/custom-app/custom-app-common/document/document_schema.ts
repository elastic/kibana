/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  getCapability,
  getNodeSchemas,
  nodeSchema,
  type AppNode,
  type AppNodeOfType,
  type AppNodeType,
  type ContainerNode,
} from '@kbn/custom-app-registry';
import { CUSTOM_APP_STATE_VERSION } from './constants';
import { bindable, stateKeySchema, themeAccentSchema, themeShapeSchema } from './bindings';
import { actionSchema, stateDeclarationSchema } from './action_schemas';
import type { casesSourceSchema } from './data_fields';
import type { formFieldSchema } from './input_schemas';
import { validateDocument } from './validate_document';

export { stateKeySchema, actionSchema, stateDeclarationSchema, nodeSchema, getNodeSchemas };
export type { AppNode, AppNodeOfType, AppNodeType, ContainerNode };
export type { Action } from '@kbn/custom-app-registry';
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

export type StateDeclaration = z.output<typeof stateDeclarationSchema>;
export type AppTheme = z.output<typeof themeSchema>;

/**
 * An app. It is written out, and not worked out from the schema, so that the nodes stay the ones
 * that are registered where the type is used: a package that registers none cannot know them.
 */
export interface AppDocument {
  state: Record<string, StateDeclaration>;
  root: AppNode;
  theme?: AppTheme;
}

export const appDocumentShapeSchema: z.ZodType<AppDocument, unknown> = lazySchema(() =>
  z.object({
    state: z.record(stateKeySchema, stateDeclarationSchema).default({}),
    root: nodeSchema,
    theme: themeSchema.optional(),
  })
);

export const appDocumentSchema: z.ZodType<AppDocument, unknown> = lazySchema(() =>
  appDocumentShapeSchema.superRefine(validateDocument)
);

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
