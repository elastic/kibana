/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CUSTOM_CONTENT_MAX_HEIGHT, CUSTOM_CONTENT_MIN_HEIGHT } from '@kbn/custom-content-common';
import {
  CASES_SORT_FIELDS,
  THEME_ACCENTS,
  THEME_SHAPES,
  CUSTOM_APP_STATE_VERSION,
  MAX_ACTIONS_PER_EVENT,
  MAX_BUTTON_GROUP_OPTIONS,
  MAX_CASES_FILTER_LENGTH,
  MAX_CASES_LIMIT,
  MAX_INPUT_OPTIONS,
  MAX_LIST_ITEMS,
  MAX_CHILDREN_PER_NODE,
  MAX_FORM_FIELDS,
  MAX_HEADING_LENGTH,
  MAX_KEY_VALUE_FIELDS,
  MAX_LINK_APP_ID_LENGTH,
  MAX_LINK_PATH_LENGTH,
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
  BADGE_COLORS,
  CARD_ICONS,
  MAX_COLUMNS,
  PROGRESS_COLORS,
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

/** A list of texts, such as the usernames to look for. */
const listValueSchema = z.array(z.string().max(MAX_STATE_STRING_LENGTH)).max(MAX_LIST_ITEMS);

/** Every state key needs a default so a query that uses it always has a value. */
export const stateDeclarationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('string'), default: z.string().max(MAX_STATE_STRING_LENGTH) }),
  z.object({ type: z.literal('number'), default: z.number().finite() }),
  z.object({ type: z.literal('boolean'), default: z.boolean() }),
  z.object({ type: z.literal('list'), default: listValueSchema }),
]);

/** An ES|QL query. A component that shows data carries its own. */
const querySchema = z.string().min(1).max(MAX_QUERY_LENGTH);

/** The closed set of things a user interaction can do. */
const setStateActionSchema = z.object({
  type: z.literal('setState'),
  key: stateKeySchema,
  value: z.union([
    stateValueSchema,
    listValueSchema,
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

/** A filter of the cases: a fixed value, or one of the app, so that an input can drive it. */
const casesFilterSchema = z.union([
  z.string().max(MAX_CASES_FILTER_LENGTH),
  z.object({ fromState: stateKeySchema }),
]);

/**
 * The cases the user can see, as an alternative to a query for what a component shows. An empty
 * filter filters nothing, so a select that has an "All" with no value works as it reads.
 */
const casesSourceSchema = z.object({
  type: z.literal('cases'),
  status: casesFilterSchema.optional(),
  severity: casesFilterSchema.optional(),
  search: casesFilterSchema.optional(),
  tag: casesFilterSchema.optional(),
  sort: z.object({ field: z.enum(CASES_SORT_FIELDS), order: z.enum(['asc', 'desc']) }).optional(),
  limit: z.number().int().min(1).max(MAX_CASES_LIMIT).optional(),
  /** Only the cases created in the period of the app. Without it, they are all of them. */
  followTimeRange: z.boolean().optional(),
  /** Only how many cases there are, as one value, for a stat. */
  count: z.boolean().optional(),
});

/**
 * What a component that shows data gets it from: a query, or a source. One of the two, which
 * validation checks, since the schema alone cannot say that.
 */
const dataFields = {
  query: querySchema.optional(),
  source: casesSourceSchema.optional(),
};

const statNodeSchema = z.object({
  type: z.literal('stat'),
  id: nodeIdSchema,
  title: z.string().max(MAX_HEADING_LENGTH),
  ...dataFields,
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
  /**
   * Moments to mark on a chart that is over time, from a query of their own: each row is a vertical
   * line, at the time of its `time` column and named by its `label` column. With `showWhen`, they are
   * shown only while that value of the app, a switch for example, is true.
   */
  annotations: z
    .object({
      query: querySchema,
      time: z.string().min(1).max(MAX_HEADING_LENGTH),
      label: z.string().min(1).max(MAX_HEADING_LENGTH).optional(),
      showWhen: stateKeySchema.optional(),
    })
    .optional(),
  /**
   * What happens when a bar, a point or a slice is clicked. The columns of the clicked row of the
   * query can be remembered, as a row click of a table does.
   */
  onClick: actionsSchema.default([]),
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
  ...dataFields,
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

/**
 * Where a link goes, always inside Kibana: the query of a component opened in Discover, a page of
 * any Kibana application, or another custom app. A path starts at the application, so it can never
 * name another site.
 */
const linkTargetSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('discover'),
    /** The id of the component whose ES|QL query is opened. */
    from: nodeIdSchema,
  }),
  z.object({
    type: z.literal('app'),
    /** The id of the application, as Kibana knows it, such as `dashboards` or `discover`. */
    app: z
      .string()
      .min(1)
      .max(MAX_LINK_APP_ID_LENGTH)
      .regex(/^[A-Za-z0-9_:.-]+$/),
    /** Where in the application. `{{state.key}}` in it is replaced with the value, made safe for a path. */
    path: z
      .string()
      .max(MAX_LINK_PATH_LENGTH)
      // Not a scheme (`https:`), and not `//host`: it is a place in the application, not a site.
      .refine((path) => !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path) && !/^[\\/]{2}/.test(path), {
        message: 'A path is a place in the application, not an address',
      })
      .optional(),
  }),
  z.object({
    type: z.literal('custom_app'),
    /** The id of a saved custom app. */
    id: z.string().min(1).max(MAX_NODE_ID_LENGTH),
  }),
]);

const linkNodeSchema = z.object({
  type: z.literal('link'),
  id: nodeIdSchema,
  label: z.string().min(1).max(MAX_HEADING_LENGTH),
  to: linkTargetSchema,
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

const formFieldFields = {
  /** The value of the app the answer is put in when the form is submitted. */
  bind: stateKeySchema,
  label: z.string().min(1).max(MAX_HEADING_LENGTH),
  /** A form is not submitted while a required field is empty. */
  required: z.boolean().optional(),
};

const formFieldSchema = z.discriminatedUnion('kind', [
  z.object({
    ...formFieldFields,
    kind: z.literal('text'),
    placeholder: z.string().max(MAX_HEADING_LENGTH).optional(),
  }),
  z.object({
    ...formFieldFields,
    kind: z.literal('textarea'),
    placeholder: z.string().max(MAX_HEADING_LENGTH).optional(),
  }),
  z.object({
    ...formFieldFields,
    kind: z.literal('select'),
    options: z.array(inputOptionSchema).min(1).max(MAX_INPUT_OPTIONS),
  }),
]);

/**
 * Asks for a few answers and does something with them when it is submitted. Unlike an input, a
 * field changes nothing while it is typed in: on submit the answers are put in their values of the
 * app, and then `onSubmit` runs, so that it, a workflow in particular, is given what was answered.
 */
const formNodeSchema = z.object({
  type: z.literal('form'),
  id: nodeIdSchema,
  fields: z.array(formFieldSchema).min(1).max(MAX_FORM_FIELDS),
  submitLabel: z.string().min(1).max(MAX_HEADING_LENGTH),
  onSubmit: actionsSchema.default([]),
});

/**
 * The options are the ones written here, and the ones a query gives after them: the first column
 * is the value, and a second column, when there is one, its label. Either is enough, which
 * validation checks.
 */
const selectNodeSchema = z.object({
  type: z.literal('select'),
  ...inputFields,
  options: z.array(inputOptionSchema).max(MAX_INPUT_OPTIONS).default([]),
  optionsQuery: querySchema.optional(),
  /** Several options can be chosen, and the value it sets is a list. Nothing chosen is an empty list. */
  multiple: z.boolean().optional(),
});

const buttonGroupNodeSchema = z.object({
  type: z.literal('button_group'),
  ...inputFields,
  options: z.array(inputOptionSchema).min(1).max(MAX_BUTTON_GROUP_OPTIONS),
});

/**
 * A box in which people write one value per line, such as the usernames to look for. The value it
 * sets is a list: the lines, without the empty ones and the repeated ones.
 */
const listInputNodeSchema = z.object({
  type: z.literal('list_input'),
  ...inputFields,
  placeholder: z.string().max(MAX_HEADING_LENGTH).optional(),
});

/**
 * A switch, which is on or off. The value it sets is a true or a false, so it is bound to a key that
 * is one, and what it shows follows what the key is.
 */
const switchNodeSchema = z.object({
  type: z.literal('switch'),
  ...inputFields,
});

const searchNodeSchema = z.object({
  type: z.literal('search'),
  ...inputFields,
  placeholder: z.string().max(MAX_HEADING_LENGTH).optional(),
});

const keyValueNodeSchema = z.object({
  type: z.literal('key_value'),
  id: nodeIdSchema,
  ...dataFields,
  /** Defaults to every column of the first row. */
  fields: z.array(z.string().min(1).max(MAX_HEADING_LENGTH)).max(MAX_KEY_VALUE_FIELDS).optional(),
});

/**
 * A number that is a thing among others, with how it changed: the first column of the first row is
 * the value, and `compare`, a column, is what it was before, shown as the change and coloured by
 * whether that is for the better.
 */
const metricNodeSchema = z.object({
  type: z.literal('metric'),
  id: nodeIdSchema,
  title: z.string().max(MAX_HEADING_LENGTH),
  ...dataFields,
  compare: z.string().min(1).max(MAX_HEADING_LENGTH).optional(),
  betterWhen: z.enum(['higher', 'lower']).default('higher'),
});

/** A bar that is filled as far as the first column of the first row is of `max`. */
const progressNodeSchema = z.object({
  type: z.literal('progress'),
  id: nodeIdSchema,
  label: z.string().max(MAX_HEADING_LENGTH).optional(),
  ...dataFields,
  max: z.number().finite().positive().default(100),
  color: z.enum(PROGRESS_COLORS).default('primary'),
});

/** A short word or two with a colour, such as a status. */
const badgeNodeSchema = z.object({
  type: z.literal('badge'),
  id: nodeIdSchema,
  text: z.string().min(1).max(MAX_HEADING_LENGTH),
  color: z.enum(BADGE_COLORS).default('default'),
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

const cardFields = {
  type: z.literal('card'),
  id: nodeIdSchema,
  title: z.string().max(MAX_HEADING_LENGTH).optional(),
  description: z.string().max(MAX_TEXT_LENGTH).optional(),
  icon: z.enum(CARD_ICONS).optional(),
};

/** What is inside is laid out in this many columns, which wrap under each other on a narrow screen. */
const columnsFields = {
  type: z.literal('columns'),
  id: nodeIdSchema,
  columns: z.number().int().min(2).max(MAX_COLUMNS).default(2),
};

/** A titled part of `tabs` or `accordion`, which hold nothing else. */
const sectionFields = {
  type: z.literal('section'),
  id: nodeIdSchema,
  label: z.string().min(1).max(MAX_HEADING_LENGTH),
  /** In an accordion, whether it starts open. */
  open: z.boolean().optional(),
};

const tabsFields = { type: z.literal('tabs'), id: nodeIdSchema };
const accordionFields = { type: z.literal('accordion'), id: nodeIdSchema };

type LeafNode =
  | z.output<typeof metricNodeSchema>
  | z.output<typeof progressNodeSchema>
  | z.output<typeof badgeNodeSchema>
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
  | z.output<typeof switchNodeSchema>
  | z.output<typeof listInputNodeSchema>
  | z.output<typeof buttonNodeSchema>
  | z.output<typeof linkNodeSchema>
  | z.output<typeof formNodeSchema>
  | z.output<typeof timeRangeNodeSchema>;

type WithChildren<Fields extends z.ZodRawShape> = z.output<z.ZodObject<Fields>> & {
  children: AppNode[];
};
type StackNode = WithChildren<typeof stackFields>;
type FlyoutNode = WithChildren<typeof flyoutFields>;
type CardNode = WithChildren<typeof cardFields>;
type ColumnsNode = WithChildren<typeof columnsFields>;
type SectionNode = WithChildren<typeof sectionFields>;
type TabsNode = WithChildren<typeof tabsFields>;
type AccordionNode = WithChildren<typeof accordionFields>;

/** The nodes that hold other nodes. */
export type ContainerNode =
  | StackNode
  | FlyoutNode
  | CardNode
  | ColumnsNode
  | SectionNode
  | TabsNode
  | AccordionNode;

/**
 * Written out by hand because TypeScript cannot infer a union that contains itself. The
 * `satisfies` on `nodeSchema` fails to compile if the schemas stop producing this type.
 */
export type AppNode = LeafNode | ContainerNode;
export type AppNodeType = AppNode['type'];
export type AppNodeOfType<T extends AppNodeType> = Extract<AppNode, { type: T }>;
export type Action = z.output<typeof actionSchema>;
export type FormField = z.output<typeof formFieldSchema>;
export type CasesSource = z.output<typeof casesSourceSchema>;
/** Where a component gets what it shows. */
export type DataSource = { type: 'esql'; query: string } | CasesSource;

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

const cardNodeSchema = z.object({
  ...cardFields,
  get children(): z.ZodArray<z.ZodType<AppNode>> {
    return z.array(nodeSchema).max(MAX_CHILDREN_PER_NODE);
  },
});

const columnsNodeSchema = z.object({
  ...columnsFields,
  get children(): z.ZodArray<z.ZodType<AppNode>> {
    return z.array(nodeSchema).max(MAX_CHILDREN_PER_NODE);
  },
});

const sectionNodeSchema = z.object({
  ...sectionFields,
  get children(): z.ZodArray<z.ZodType<AppNode>> {
    return z.array(nodeSchema).max(MAX_CHILDREN_PER_NODE);
  },
});

const tabsNodeSchema = z.object({
  ...tabsFields,
  get children(): z.ZodArray<z.ZodType<AppNode>> {
    return z.array(nodeSchema).max(MAX_CHILDREN_PER_NODE);
  },
});

const accordionNodeSchema = z.object({
  ...accordionFields,
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
  switchNodeSchema,
  searchNodeSchema,
  listInputNodeSchema,
  buttonNodeSchema,
  linkNodeSchema,
  formNodeSchema,
  timeRangeNodeSchema,
  metricNodeSchema,
  progressNodeSchema,
  badgeNodeSchema,
  stackNodeSchema,
  flyoutNodeSchema,
  cardNodeSchema,
  columnsNodeSchema,
  sectionNodeSchema,
  tabsNodeSchema,
  accordionNodeSchema,
]) satisfies z.ZodType<AppNode>;

const CONTAINER_TYPES: ReadonlySet<string> = new Set([
  'stack',
  'flyout',
  'card',
  'columns',
  'section',
  'tabs',
  'accordion',
]);

/** Whether a node holds other nodes. */
export const isContainerNode = (node: AppNode): node is ContainerNode =>
  CONTAINER_TYPES.has(node.type);

/** Returns the direct children of a node, empty for leaf nodes. */
export const getNodeChildren = (node: AppNode): readonly AppNode[] =>
  isContainerNode(node) ? node.children : [];

/**
 * The shape of a document, without the checks that look across it. For anything that only needs
 * to say what a document looks like, such as the input of an agent tool, whose own handler then
 * reports what is wrong with it in words an agent can act on.
 */
/**
 * How a page looks, as a choice from a short list and not as colours and sizes to set. It changes
 * every component at once: the accent is the colour of what can be pressed and followed, and the
 * shape is how round the corners are. A page with none looks as Kibana does.
 */
export const themeSchema = z.object({
  accent: z.enum(THEME_ACCENTS).optional(),
  /**
   * A string state key whose value is the accent, so that a control can change it, such as a button
   * group whose options are accent names. A value that is not an accent leaves `accent`.
   */
  accentFrom: stateKeySchema.optional(),
  shape: z.enum(THEME_SHAPES).optional(),
});

export const appDocumentShapeSchema = z.object({
  state: z.record(stateKeySchema, stateDeclarationSchema).default({}),
  root: nodeSchema,
  theme: themeSchema.optional(),
});

export const appDocumentSchema = appDocumentShapeSchema.superRefine(validateDocument);

export type StateDeclaration = z.output<typeof stateDeclarationSchema>;
export type AppTheme = z.output<typeof themeSchema>;
export type AppDocument = z.output<typeof appDocumentSchema>;

/** The panel's own state, without the titles and time range every panel shares. */
export const customAppStateSchema = z.object({
  version: z.literal(CUSTOM_APP_STATE_VERSION),
  document: appDocumentSchema,
});

export type CustomAppState = z.output<typeof customAppStateSchema>;
