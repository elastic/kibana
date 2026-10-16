/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CUSTOM_CONTENT_MAX_HEIGHT, CUSTOM_CONTENT_MIN_HEIGHT } from '@kbn/custom-content-common';
import {
  CUSTOM_APP_STATE_VERSION,
  MAX_ACTIONS_PER_EVENT,
  MAX_BUTTON_GROUP_OPTIONS,
  MAX_INPUT_OPTIONS,
  MAX_CHILDREN_PER_NODE,
  MAX_HEADING_LENGTH,
  MAX_KEY_VALUE_FIELDS,
  MAX_NODE_ID_LENGTH,
  MAX_PROMPT_LENGTH,
  MAX_QUERY_LENGTH,
  MAX_STATE_KEY_LENGTH,
  MAX_STATE_STRING_LENGTH,
  MAX_TABLE_COLUMNS,
  MAX_TEMPLATE_LENGTH,
  MAX_WORKFLOW_ID_LENGTH,
  MAX_WORKFLOW_INPUT_NAME_LENGTH,
  MAX_WORKFLOW_INPUTS,
  MAX_TEXT_LENGTH,
  RESERVED_STATE_KEYS,
} from './constants';
import { validateDocument } from './validate_document';

const nodeIdSchema = z
  .string()
  .min(1)
  .max(MAX_NODE_ID_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/);

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

/** An ES|QL query. A component that shows data carries its own. */
const querySchema = z.string().min(1).max(MAX_QUERY_LENGTH);

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

/**
 * Runs a Workflow, as the person who triggered it, so it needs no more privilege than they have.
 * What it hands over is a closed set: a fixed value, a column of the row that was clicked, or a
 * value of the app. They travel as typed values and are never put together into text.
 */
const runWorkflowActionSchema = z.object({
  type: z.literal('runWorkflow'),
  /** The id of the workflow, as the Workflows application knows it. */
  workflow: z.string().min(1).max(MAX_WORKFLOW_ID_LENGTH),
  inputs: z
    .record(
      z.string().min(1).max(MAX_WORKFLOW_INPUT_NAME_LENGTH),
      z.union([
        stateValueSchema,
        z.object({ fromColumn: z.string().min(1).max(MAX_HEADING_LENGTH) }),
        z.object({ fromState: stateKeySchema }),
      ])
    )
    .refine((inputs) => Object.keys(inputs).length <= MAX_WORKFLOW_INPUTS, {
      message: `An action may hand at most ${MAX_WORKFLOW_INPUTS} inputs to a workflow`,
    })
    .default({}),
});

const openFlyoutActionSchema = z.object({ type: z.literal('openFlyout'), flyout: nodeIdSchema });
const closeFlyoutActionSchema = z.object({ type: z.literal('closeFlyout') });

export const actionSchema = z.discriminatedUnion('type', [
  setStateActionSchema,
  openFlyoutActionSchema,
  closeFlyoutActionSchema,
  runWorkflowActionSchema,
]);

const actionsSchema = z.array(actionSchema).max(MAX_ACTIONS_PER_EVENT);

const headingNodeSchema = z.object({
  type: z.literal('heading'),
  id: nodeIdSchema,
  text: z.string().max(MAX_HEADING_LENGTH),
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
  query: querySchema,
});

/** What the chart looks like is picked from the shape of the result unless the author chooses. */
const CHART_TYPES = ['bar', 'line', 'area', 'donut'] as const;

const chartNodeSchema = z.object({
  type: z.literal('chart'),
  id: nodeIdSchema,
  /** A heading above the chart. */
  title: z.string().max(MAX_HEADING_LENGTH).optional(),
  query: querySchema,
  /** Left out, the chart is suggested from the columns of the query, as Discover does. */
  chartType: z.enum(CHART_TYPES).optional(),
});

/**
 * HTML with Liquid in it, filled with the rows of the query and shown in a sandbox, as in a custom
 * content panel. `template` is optional here, and `prompt` exists, only so that an agent can ask
 * for a template to be written: whoever receives the document turns the prompt into the template
 * and drops it, and a document that is saved always has a template.
 */
const customContentNodeSchema = z.object({
  type: z.literal('custom_content'),
  id: nodeIdSchema,
  /** Without a query the template is shown as it is. */
  query: querySchema.optional(),
  template: z.string().max(MAX_TEMPLATE_LENGTH).optional(),
  /** The template is shown in a frame that cannot measure it, so it says how tall it needs to be. */
  height: z.number().int().min(CUSTOM_CONTENT_MIN_HEIGHT).max(CUSTOM_CONTENT_MAX_HEIGHT).optional(),
  prompt: z.string().min(1).max(MAX_PROMPT_LENGTH).optional(),
});

const tableNodeSchema = z.object({
  type: z.literal('table'),
  id: nodeIdSchema,
  query: querySchema,
  /** Names the table for screen readers. */
  caption: z.string().max(MAX_HEADING_LENGTH).optional(),
  /** Defaults to every column of the result, shown as text. */
  columns: z
    .array(
      z.object({
        field: z.string().min(1).max(MAX_HEADING_LENGTH),
        label: z.string().max(MAX_HEADING_LENGTH).optional(),
      })
    )
    .max(MAX_TABLE_COLUMNS)
    .optional(),
  onRowClick: actionsSchema.default([]),
});

/** What a person presses to make something happen: the actions it lists, in order. */
/**
 * Lets people change the period the app shows. It has nothing to set: where it is, in the layout, is
 * the author's say, and what it does follows from where the app is shown. An app without one keeps
 * the period it is shown with.
 */
const timeRangeNodeSchema = z.object({
  type: z.literal('time_range'),
  id: nodeIdSchema,
});

const buttonNodeSchema = z.object({
  type: z.literal('button'),
  id: nodeIdSchema,
  label: z.string().min(1).max(MAX_HEADING_LENGTH),
  onClick: actionsSchema.default([]),
});

const inputOptionSchema = z.object({
  value: z.string().max(MAX_STATE_STRING_LENGTH),
  label: z.string().max(MAX_HEADING_LENGTH).optional(),
});

/**
 * Inputs write the state key named by `bind`, then run `onChange`, where `fromInput` is the
 * value just entered. Every input is bound to a string key.
 */
const inputFields = {
  id: nodeIdSchema,
  label: z.string().max(MAX_HEADING_LENGTH),
  bind: stateKeySchema,
  onChange: actionsSchema.default([]),
};

const selectNodeSchema = z.object({
  type: z.literal('select'),
  ...inputFields,
  options: z.array(inputOptionSchema).min(1).max(MAX_INPUT_OPTIONS),
});

const buttonGroupNodeSchema = z.object({
  type: z.literal('button_group'),
  ...inputFields,
  options: z.array(inputOptionSchema).min(1).max(MAX_BUTTON_GROUP_OPTIONS),
});

const searchNodeSchema = z.object({
  type: z.literal('search'),
  ...inputFields,
  placeholder: z.string().max(MAX_HEADING_LENGTH).optional(),
});

const keyValueNodeSchema = z.object({
  type: z.literal('key_value'),
  id: nodeIdSchema,
  query: querySchema,
  /** Defaults to every column of the first row. */
  fields: z.array(z.string().min(1).max(MAX_HEADING_LENGTH)).max(MAX_KEY_VALUE_FIELDS).optional(),
});

const stackFields = {
  type: z.literal('stack'),
  id: nodeIdSchema,
  direction: z.enum(['vertical', 'horizontal']).default('vertical'),
};

const flyoutFields = {
  type: z.literal('flyout'),
  id: nodeIdSchema,
  title: z.string().max(MAX_HEADING_LENGTH),
};

type LeafNode =
  | z.output<typeof headingNodeSchema>
  | z.output<typeof textNodeSchema>
  | z.output<typeof calloutNodeSchema>
  | z.output<typeof statNodeSchema>
  | z.output<typeof chartNodeSchema>
  | z.output<typeof customContentNodeSchema>
  | z.output<typeof tableNodeSchema>
  | z.output<typeof keyValueNodeSchema>
  | z.output<typeof selectNodeSchema>
  | z.output<typeof buttonGroupNodeSchema>
  | z.output<typeof searchNodeSchema>
  | z.output<typeof buttonNodeSchema>
  | z.output<typeof timeRangeNodeSchema>;

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
  chartNodeSchema,
  customContentNodeSchema,
  tableNodeSchema,
  keyValueNodeSchema,
  selectNodeSchema,
  buttonGroupNodeSchema,
  searchNodeSchema,
  buttonNodeSchema,
  timeRangeNodeSchema,
  stackNodeSchema,
  flyoutNodeSchema,
]) satisfies z.ZodType<AppNode>;

/** Returns the direct children of a node, empty for leaf nodes. */
export const getNodeChildren = (node: AppNode): readonly AppNode[] =>
  node.type === 'stack' || node.type === 'flyout' ? node.children : [];

/**
 * The shape of a document, without the checks that look across it. For anything that only needs
 * to say what a document looks like, such as the input of an agent tool, whose own handler then
 * reports what is wrong with it in words an agent can act on.
 */
export const appDocumentShapeSchema = z.object({
  state: z.record(stateKeySchema, stateDeclarationSchema).default({}),
  root: nodeSchema,
});

export const appDocumentSchema = appDocumentShapeSchema.superRefine(validateDocument);

export type StateDeclaration = z.output<typeof stateDeclarationSchema>;
export type AppDocument = z.output<typeof appDocumentSchema>;

/** The panel's own state, without the titles and time range every panel shares. */
export const customAppStateSchema = z.object({
  version: z.literal(CUSTOM_APP_STATE_VERSION),
  document: appDocumentSchema,
});

export type CustomAppState = z.output<typeof customAppStateSchema>;
