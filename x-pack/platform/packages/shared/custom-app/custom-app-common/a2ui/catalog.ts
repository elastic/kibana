/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { actionSchema, nodeSchema, themeSchema } from '../document_schema';
import { CUSTOM_APP_CATALOG_ID } from './convert';
import { INTERPOLATED_PROPS } from './interpolated_props';

type Schema = Record<string, unknown>;

const isObject = (value: unknown): value is Schema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const SPEC = 'https://a2ui.org/specification/v0_9';
const COMMON = `${SPEC}/common_types.json`;
const BASIC_CATALOG = `${SPEC}/catalogs/basic/catalog.json`;

/** A type of the A2UI specification, which a catalog refers to and does not copy. */
const common = (name: string): Schema => ({ $ref: `${COMMON}#/$defs/${name}` });

/** What a binding is in A2UI: a path in the data model, which is the name of a value of the app. */
const DATA_BINDING = common('DataBinding');

const ACTIONS = actionSchema.options.map((option) => ({
  name: option.shape.type.value as string,
  shape: option.shape as Record<string, z.ZodType>,
}));

const toComponentName = (type: string): string =>
  type
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('');

const toJsonSchema = (shape: Record<string, z.ZodType>): Schema =>
  z.toJSONSchema(z.object(shape), { io: 'input', unrepresentable: 'any' }) as Schema;

/** Our references to a value, where they are in a schema, as A2UI writes a dynamic value. */
const toA2uiShape = (schema: unknown): unknown => {
  if (Array.isArray(schema)) return schema.map(toA2uiShape);
  if (!isObject(schema)) return schema;

  const properties = isObject(schema.properties) ? schema.properties : undefined;
  if (properties && '$state' in properties) {
    // A reference to a value, with what it is to equal when that is asked: a boolean, which is a
    // path or a function that compares.
    return 'equals' in properties ? common('DynamicBoolean') : DATA_BINDING;
  }

  const mapped = Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, toA2uiShape(value)])
  );
  // A property that can read a value can also be given by a function, as a dynamic value can.
  if (Array.isArray(mapped.anyOf) && mapped.anyOf.some((member) => member === DATA_BINDING)) {
    mapped.anyOf = [...mapped.anyOf, common('FunctionCall')];
  }
  return mapped;
};

/** A schema of something that sets a value, with `bind` written as A2UI binds a value. */
const withValueBinding = (schema: Schema): Schema => {
  const variants = ['anyOf', 'oneOf'].find((key) => Array.isArray(schema[key]));
  if (variants) {
    return {
      ...schema,
      [variants]: (schema[variants] as unknown[]).map((variant) =>
        isObject(variant) ? withValueBinding(variant) : variant
      ),
    };
  }
  const properties = isObject(schema.properties) ? { ...schema.properties } : {};
  if (!('bind' in properties)) return schema;
  delete properties.bind;
  properties.value = DATA_BINDING;
  return {
    ...schema,
    properties,
    required: (Array.isArray(schema.required) ? schema.required : []).map((name) =>
      name === 'bind' ? 'value' : name
    ),
  };
};

/** The properties of a component, with what A2UI writes differently written so. */
const toComponentProperties = (type: string, shape: Schema): Schema => {
  const properties = isObject(shape.properties) ? { ...shape.properties } : {};
  const required = Array.isArray(shape.required) ? [...shape.required] : [];

  Object.entries(properties).forEach(([name, value]) => {
    // What happens on an event is one action, a function call.
    if (/^on[A-Z]/.test(name) && isObject(value) && value.type === 'array') {
      properties[name] = common('Action');
    }
  });
  (INTERPOLATED_PROPS[type] ?? []).forEach((name) => {
    if (name in properties) properties[name] = common('DynamicString');
  });

  if ('bind' in properties) {
    delete properties.bind;
    properties.value = DATA_BINDING;
    const index = required.indexOf('bind');
    if (index !== -1) required[index] = 'value';
  }

  // A form's fields set values of the app, each by a binding. A field is one of several kinds.
  const fields = properties.fields;
  if (type === 'form' && isObject(fields) && isObject(fields.items)) {
    properties.fields = { ...fields, items: withValueBinding(fields.items) };
  }

  return toA2uiShape({ ...shape, properties, required }) as Schema;
};

/** What a function of the catalog is given, from what an action of ours has besides its type. */
const toFunction = (name: string, shape: Record<string, z.ZodType>): Schema => {
  const { type: _type, ...argShape } = shape;
  const args = toJsonSchema(argShape);
  const hasArgs = Object.keys(argShape).length > 0;
  return {
    type: 'object',
    description: `Runs the action "${name}" of the app, in the renderer.`,
    properties: {
      call: { const: name },
      args: hasArgs ? { ...args, additionalProperties: false } : { type: 'object' },
      returnType: { const: 'void' },
    },
    required: hasArgs ? ['call', 'args'] : ['call'],
    unevaluatedProperties: false,
  };
};

/**
 * The catalog of the components of a custom app, as A2UI defines a catalog: a JSON Schema file with
 * the components, the functions the renderer runs, and the theme. It is made from the schema of the
 * document, so that what is published is what is checked, and it describes the components as A2UI
 * sends them: all at one level, their children by id, their values by a path, written with the types
 * of the specification.
 */
/** What a component of a catalog is: its name, its own properties, and whether it lists children. */
interface ComponentEntry {
  properties: Schema;
  required: string[];
  hasChildren: boolean;
}

const toComponent = (
  name: string,
  { properties, required, hasChildren }: ComponentEntry
): Schema => ({
  type: 'object',
  allOf: [
    common('ComponentCommon'),
    { $ref: '#/$defs/CatalogComponentCommon' },
    {
      type: 'object',
      properties: {
        component: { const: name },
        ...(hasChildren ? { children: common('ChildList') } : {}),
        ...properties,
      },
      required: ['component', ...(hasChildren ? ['children'] : []), ...required],
    },
  ],
  unevaluatedProperties: false,
});

/**
 * The components of the basic catalog that a node of ours is, where the meaning is the same: they
 * have the name and the properties of the basic one, with what ours has besides. A node of ours
 * that is none of them keeps a name of its own.
 */
const ALIGNED_TYPES: ReadonlySet<string> = new Set([
  'stack',
  'heading',
  'text',
  'switch',
  'search',
  'button',
  'card',
  'tabs',
]);

const without = (properties: Schema, ...names: string[]): Schema =>
  Object.fromEntries(Object.entries(properties).filter(([key]) => !names.includes(key)));

export const createCustomAppCatalog = (): Schema => {
  const generic = new Map<string, ComponentEntry>();
  nodeSchema.options.forEach((option) => {
    const type = option.shape.type.value as string;
    const {
      type: _type,
      id: _id,
      children: _children,
      ...shape
    } = option.shape as Record<string, z.ZodType>;
    const props = toComponentProperties(type, toJsonSchema(shape));
    generic.set(type, {
      properties: props.properties as Schema,
      required: (props.required as string[] | undefined) ?? [],
      hasChildren: 'children' in option.shape,
    });
  });
  const own = (type: string): ComponentEntry => generic.get(type) as ComponentEntry;
  const visibleWhen = { visibleWhen: common('DynamicBoolean') };

  const entries: Array<[string, ComponentEntry]> = [
    // Layout: a stack is a column, or a row.
    ...(['Column', 'Row'] as const).map((name): [string, ComponentEntry] => [
      name,
      { ...own('stack'), properties: without(own('stack').properties, 'direction') },
    ]),
    // Text: a heading is a text of a heading's size, and a text that is written in Markdown is a body.
    [
      'Text',
      {
        hasChildren: false,
        required: ['text'],
        properties: {
          text: common('DynamicString'),
          variant: { type: 'string', enum: ['h1', 'h2', 'h3', 'h4', 'h5', 'caption', 'body'] },
          ...visibleWhen,
        },
      },
    ],
    // Inputs: a switch is a check box, and a search is a text field.
    [
      'CheckBox',
      {
        hasChildren: false,
        required: ['label', 'value'],
        properties: { ...own('switch').properties, value: common('DynamicBoolean') },
      },
    ],
    [
      'TextField',
      {
        hasChildren: false,
        required: ['label', 'value'],
        properties: {
          ...own('search').properties,
          variant: { type: 'string', enum: ['shortText'] },
        },
      },
    ],
    // A button has a component for what it says, and an action.
    [
      'Button',
      {
        hasChildren: false,
        required: ['child', 'action'],
        properties: {
          child: common('ComponentId'),
          action: common('Action'),
          ...visibleWhen,
        },
      },
    ],
    // A card holds one component, which is a column when it holds several.
    [
      'Card',
      {
        hasChildren: false,
        required: ['child'],
        properties: {
          ...without(own('card').properties, 'children'),
          child: common('ComponentId'),
        },
      },
    ],
    // Tabs are a title and a component each, which is a column of what is in the section.
    [
      'Tabs',
      {
        hasChildren: false,
        required: ['tabs'],
        properties: {
          tabs: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: common('DynamicString'), child: common('ComponentId') },
              required: ['title', 'child'],
              additionalProperties: false,
            },
          },
          ...visibleWhen,
        },
      },
    ],
    ...[...generic.entries()]
      .filter(([type]) => !ALIGNED_TYPES.has(type))
      .map(([type, entry]): [string, ComponentEntry] => [toComponentName(type), entry]),
  ];
  const components = Object.fromEntries(
    entries.map(([name, entry]) => [name, toComponent(name, entry)])
  );

  const functions: Record<string, Schema> = {
    ...Object.fromEntries(ACTIONS.map(({ name, shape }) => [name, toFunction(name, shape)])),
    sequence: {
      type: 'object',
      description: 'Runs several functions, one after the other.',
      properties: {
        call: { const: 'sequence' },
        args: {
          type: 'object',
          properties: { actions: { type: 'array', items: common('FunctionCall') } },
          required: ['actions'],
          additionalProperties: false,
        },
        returnType: { const: 'void' },
      },
      required: ['call', 'args'],
      unevaluatedProperties: false,
    },
    equals: {
      type: 'object',
      description: 'Whether two values are the same, such as a value of the app and an option.',
      properties: {
        call: { const: 'equals' },
        args: {
          type: 'object',
          properties: { a: common('DynamicValue'), b: common('DynamicValue') },
          required: ['a', 'b'],
          additionalProperties: false,
        },
        returnType: { const: 'boolean' },
      },
      required: ['call', 'args'],
      unevaluatedProperties: false,
    },
    // The text of a component with values of the app in it, as the basic catalog has it.
    formatString: { $ref: `${BASIC_CATALOG}#/functions/formatString` },
  };

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: CUSTOM_APP_CATALOG_ID,
    title: 'Kibana custom app components',
    description:
      'The components of a custom app: a page that an agent describes, and Kibana draws with ES|QL, Lens and its own components.',
    catalogId: CUSTOM_APP_CATALOG_ID,
    components,
    functions,
    $defs: {
      CatalogComponentCommon: {
        type: 'object',
        properties: {
          visibleWhen: common('DynamicBoolean'),
        },
      },
      theme: toA2uiShape(z.toJSONSchema(themeSchema, { io: 'input', unrepresentable: 'any' })),
      anyComponent: {
        oneOf: Object.keys(components).map((name) => ({ $ref: `#/components/${name}` })),
      },
      anyFunction: {
        oneOf: Object.keys(functions).map((name) => ({ $ref: `#/functions/${name}` })),
      },
    },
  };
};
