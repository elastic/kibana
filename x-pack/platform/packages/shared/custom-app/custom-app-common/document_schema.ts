/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  CUSTOM_APP_STATE_VERSION,
  MAX_ACTIONS_PER_EVENT,
  MAX_CHILDREN_PER_NODE,
  MAX_HEADING_LENGTH,
  MAX_KEY_VALUE_FIELDS,
  MAX_NODE_ID_LENGTH,
  MAX_QUERY_LENGTH,
  MAX_STATE_KEY_LENGTH,
  MAX_STATE_STRING_LENGTH,
  MAX_TABLE_COLUMNS,
  MAX_TEXT_LENGTH,
  RESERVED_STATE_KEYS,
} from './constants';
import { validateDocument } from './validate_document';

const nodeIdSchema = z
  .string()
  .min(1)
  .max(MAX_NODE_ID_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/);

const dataSourceIdSchema = nodeIdSchema;

/** A valid ES|QL parameter name, so a state key can be used as `?key` in a query. */
export const stateKeySchema = z
  .string()
  .max(MAX_STATE_KEY_LENGTH)
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
  .refine((key) => !RESERVED_STATE_KEYS.includes(key.toLowerCase()), {
    message: `Reserved by ES|QL for the time range: ${RESERVED_STATE_KEYS.join(', ')}`,
  });

const stateValueSchema = z.union([
  z.string().max(MAX_STATE_STRING_LENGTH),
  z.number().finite(),
  z.boolean(),
]);

/** Every state key needs a default so a query that uses it always has a value. */
export const stateDeclarationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('string'), default: z.string().max(MAX_STATE_STRING_LENGTH) }),
  z.object({ type: z.literal('number'), default: z.number().finite() }),
  z.object({ type: z.literal('boolean'), default: z.boolean() }),
]);

export const esqlDataSourceSchema = z.object({
  type: z.literal('esql'),
  query: z.string().min(1).max(MAX_QUERY_LENGTH),
});

/** The closed set of things a user interaction can do. */
const setStateActionSchema = z.object({
  type: z.literal('setState'),
  key: stateKeySchema,
  value: z.union([
    stateValueSchema,
    z.object({ fromColumn: z.string().min(1).max(MAX_HEADING_LENGTH) }),
    z.object({ fromInput: z.literal(true) }),
  ]),
});

const openFlyoutActionSchema = z.object({ type: z.literal('openFlyout'), flyout: nodeIdSchema });
const closeFlyoutActionSchema = z.object({ type: z.literal('closeFlyout') });

export const actionSchema = z.discriminatedUnion('type', [
  setStateActionSchema,
  openFlyoutActionSchema,
  closeFlyoutActionSchema,
]);

const actionsSchema = z.array(actionSchema).max(MAX_ACTIONS_PER_EVENT);

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

const statNodeSchema = z.object({
  type: z.literal('stat'),
  id: nodeIdSchema,
  title: z.string().max(MAX_HEADING_LENGTH),
  source: dataSourceIdSchema,
  valueField: z.string().min(1).max(MAX_HEADING_LENGTH).optional(),
  format: z.enum(['number', 'compact']).default('number'),
});

const tableNodeSchema = z.object({
  type: z.literal('table'),
  id: nodeIdSchema,
  source: dataSourceIdSchema,
  /** Defaults to every column of the result, shown as text. */
  columns: z
    .array(
      z.object({
        field: z.string().min(1).max(MAX_HEADING_LENGTH),
        label: z.string().max(MAX_HEADING_LENGTH).optional(),
        format: z.enum(['text', 'number', 'date']).default('text'),
      })
    )
    .max(MAX_TABLE_COLUMNS)
    .optional(),
  onRowClick: actionsSchema.default([]),
});

const keyValueNodeSchema = z.object({
  type: z.literal('key_value'),
  id: nodeIdSchema,
  source: dataSourceIdSchema,
  /** Defaults to every column of the first row. */
  fields: z.array(z.string().min(1).max(MAX_HEADING_LENGTH)).max(MAX_KEY_VALUE_FIELDS).optional(),
});

const stackFields = {
  type: z.literal('stack'),
  id: nodeIdSchema,
  direction: z.enum(['vertical', 'horizontal']).default('vertical'),
  gap: spacingSchema.default('m'),
};

const flyoutFields = {
  type: z.literal('flyout'),
  id: nodeIdSchema,
  title: z.string().max(MAX_HEADING_LENGTH),
  size: z.enum(['s', 'm', 'l']).default('m'),
};

type LeafNode =
  | z.output<typeof headingNodeSchema>
  | z.output<typeof textNodeSchema>
  | z.output<typeof calloutNodeSchema>
  | z.output<typeof statNodeSchema>
  | z.output<typeof tableNodeSchema>
  | z.output<typeof keyValueNodeSchema>;

type StackNode = z.output<z.ZodObject<typeof stackFields>> & { children: AppNode[] };
type FlyoutNode = z.output<z.ZodObject<typeof flyoutFields>> & { children: AppNode[] };

/**
 * Written out by hand because TypeScript cannot infer a union that contains itself. The
 * `satisfies` on `nodeSchema` fails to compile if the schemas stop producing this type.
 */
export type AppNode = LeafNode | StackNode | FlyoutNode;
export type AppNodeType = AppNode['type'];
export type AppNodeOfType<T extends AppNodeType> = Extract<AppNode, { type: T }>;
export type Action = z.output<typeof actionSchema>;

const stackNodeSchema = z.object({
  ...stackFields,
  get children(): z.ZodArray<z.ZodType<AppNode>> {
    return z.array(nodeSchema).max(MAX_CHILDREN_PER_NODE);
  },
});

const flyoutNodeSchema = z.object({
  ...flyoutFields,
  get children(): z.ZodArray<z.ZodType<AppNode>> {
    return z.array(nodeSchema).max(MAX_CHILDREN_PER_NODE);
  },
});

export const nodeSchema = z.discriminatedUnion('type', [
  headingNodeSchema,
  textNodeSchema,
  calloutNodeSchema,
  statNodeSchema,
  tableNodeSchema,
  keyValueNodeSchema,
  stackNodeSchema,
  flyoutNodeSchema,
]) satisfies z.ZodType<AppNode>;

/** Returns the direct children of a node, empty for leaf nodes. */
export const getNodeChildren = (node: AppNode): readonly AppNode[] =>
  node.type === 'stack' || node.type === 'flyout' ? node.children : [];

export const appDocumentSchema = z
  .object({
    state: z.record(stateKeySchema, stateDeclarationSchema).default({}),
    dataSources: z.record(dataSourceIdSchema, esqlDataSourceSchema).default({}),
    root: nodeSchema,
  })
  .superRefine(validateDocument);

export type EsqlDataSource = z.output<typeof esqlDataSourceSchema>;
export type StateDeclaration = z.output<typeof stateDeclarationSchema>;
export type AppDocument = z.output<typeof appDocumentSchema>;

/** The panel's own state, without the titles and time range every panel shares. */
export const customAppStateSchema = z.object({
  version: z.literal(CUSTOM_APP_STATE_VERSION),
  document: appDocumentSchema,
});

export type CustomAppState = z.output<typeof customAppStateSchema>;
