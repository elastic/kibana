/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema, type AppDocument, type AppNode } from '../document_schema';
import { getNodeChildren } from '../node_tree';
import { isStateRef } from '../bindings';
import { INTERPOLATED_PROPS } from './interpolated_props';

/** The version of the A2UI protocol the messages are in. */
export const A2UI_VERSION = 'v0.9.1';

/** Names the catalog of the components of a custom app. The version is part of it, as A2UI asks. */
export const CUSTOM_APP_CATALOG_ID = 'https://elastic.co/kibana/a2ui/custom-app/v1/catalog.json';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
interface JsonObject {
  [key: string]: Json;
}

export type A2uiMessage = { version: typeof A2UI_VERSION } & (
  | { createSurface: { surfaceId: string; catalogId: string; theme?: JsonObject } }
  | { updateDataModel: { surfaceId: string; path: string; value: Json } }
  | { updateComponents: { surfaceId: string; components: A2uiComponent[] } }
);

/** A component of a surface: its id, the name of its type, and its properties, all at one level. */
export interface A2uiComponent {
  id: string;
  component: string;
  [property: string]: Json | undefined;
}

/** The names of the properties that set a value of the app from a component. */
const INPUT_TYPES: ReadonlySet<string> = new Set([
  'select',
  'button_group',
  'switch',
  'search',
  'list_input',
]);

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toComponentName = (type: string): string =>
  type
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('');

const toNodeType = (component: string): string =>
  component.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

const toPath = (key: string): string => `/${key}`;
const fromPath = (path: string): string => path.replace(/^\//, '');

/** A reference to a value of the app, as A2UI writes a binding. */
const bindingOf = (key: string): JsonObject => ({ path: toPath(key) });

const isActionEvent = (property: string, value: unknown): value is JsonObject[] =>
  /^on[A-Z]/.test(property) && Array.isArray(value);

/** A reference in the shape of A2UI, from one in ours, anywhere in a value. */
const toBindings = (value: unknown): Json => {
  if (isStateRef(value)) return bindingOf(value.$state);
  if (Array.isArray(value)) return value.map(toBindings);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, toBindings(inner)])
    );
  }
  return value as Json;
};

/** The reverse: an object that is only a path, and what it is compared with, is a reference. */
const isBinding = (value: unknown): value is { path: string; equals?: Json } =>
  isObject(value) &&
  typeof value.path === 'string' &&
  value.path.startsWith('/') &&
  Object.keys(value).every((key) => key === 'path' || key === 'equals');

const fromBindings = (value: unknown): unknown => {
  if (isBinding(value)) {
    const { path, equals } = value;
    return equals === undefined ? { $state: fromPath(path) } : { $state: fromPath(path), equals };
  }
  if (Array.isArray(value)) return value.map(fromBindings);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, fromBindings(inner)])
    );
  }
  return value;
};

/** A function call of A2UI, from an action of ours. */
const toCall = ({ type, ...args }: JsonObject): JsonObject => ({
  call: type,
  args: toBindings(args) as JsonObject,
});

/**
 * What happens on an event, as the one action that A2UI allows: nothing, a function call, or, when
 * there are several, a call of `sequence` that does them in order.
 */
const toAction = (actions: JsonObject[]): JsonObject | undefined => {
  if (actions.length === 0) return undefined;
  return {
    functionCall:
      actions.length === 1
        ? toCall(actions[0])
        : { call: 'sequence', args: { actions: actions.map(toCall) } },
  };
};

const fromCall = (call: unknown): JsonObject | undefined => {
  if (!isObject(call) || typeof call.call !== 'string') return undefined;
  return {
    type: call.call,
    ...(isObject(call.args) ? (fromBindings(call.args) as JsonObject) : {}),
  };
};

const fromAction = (action: unknown): Json[] => {
  const call = isObject(action) && isObject(action.functionCall) ? action.functionCall : undefined;
  if (!call) return [];
  if (call.call === 'sequence' && isObject(call.args) && Array.isArray(call.args.actions)) {
    return call.args.actions.flatMap((inner) => fromCall(inner) ?? []);
  }
  const single = fromCall(call);
  return single ? [single] : [];
};

/** `{{state.key}}` in a text, as the text of `formatString` writes a value: `${/key}`. */
const toFormatString = (text: string): Json => {
  if (!text.includes('{{state.')) return text;
  const escaped = text.replace(/\$\{/g, '\\${');
  return {
    call: 'formatString',
    args: { value: escaped.replace(/\{\{state\.([A-Za-z_][A-Za-z0-9_]*)\}\}/g, '${/$1}') },
    returnType: 'string',
  };
};

const fromFormatString = (value: unknown, errors: string[]): unknown => {
  if (!isObject(value) || value.call !== 'formatString') return value;
  const text = isObject(value.args) ? value.args.value : undefined;
  if (typeof text !== 'string') {
    errors.push('A formatString has no text to fill in.');
    return '';
  }
  return text
    .replace(/(?<!\\)\$\{([^}]*)\}/g, (_match, expression: string) => {
      if (/^\/[A-Za-z_][A-Za-z0-9_]*$/.test(expression)) return `{{state.${expression.slice(1)}}}`;
      errors.push(`"\${${expression}}" is not a value of the app that this app can read.`);
      return '';
    })
    .replace(/\\\$\{/g, '${');
};

/** Whether a component is shown, as A2UI writes a boolean: a path, or a function that compares. */
const toVisibleWhen = (rule: { path: string; equals?: Json }): Json =>
  rule.equals === undefined
    ? { path: rule.path }
    : {
        call: 'equals',
        args: { a: { path: rule.path }, b: rule.equals },
        returnType: 'boolean',
      };

const fromVisibleWhen = (value: unknown): unknown => {
  if (isBinding(value)) return fromBindings(value);
  if (isObject(value) && value.call === 'equals' && isObject(value.args)) {
    const { a, b } = value.args;
    if (isBinding(a)) return { $state: fromPath(a.path), equals: b };
  }
  return value;
};

const withValueBinding = (props: JsonObject, bind: unknown): JsonObject =>
  typeof bind === 'string' ? { ...props, value: bindingOf(bind) } : props;

/** The properties of a node in the shape of A2UI: bindings, a bound value for inputs, one action. */
const toProps = (node: AppNode): JsonObject => {
  const { type, id, children, ...rest } = node as AppNode & {
    children?: unknown;
    bind?: unknown;
  };
  const { bind, ...others } = rest as JsonObject & { bind?: unknown };
  const interpolated = INTERPOLATED_PROPS[type] ?? [];

  const props: JsonObject = {};
  Object.entries(others).forEach(([property, value]) => {
    if (isActionEvent(property, value)) {
      const action = toAction(value);
      if (action) props[property] = action;
    } else if (property === 'visibleWhen' && isObject(value) && typeof value.$state === 'string') {
      props[property] = toVisibleWhen({
        path: toPath(value.$state),
        ...(value.equals === undefined ? {} : { equals: value.equals as Json }),
      });
    } else if (interpolated.includes(property) && typeof value === 'string') {
      props[property] = toFormatString(value);
    } else {
      props[property] = toBindings(value);
    }
  });

  if (type === 'form' && Array.isArray(props.fields)) {
    props.fields = props.fields.map((field) =>
      isObject(field)
        ? (({ bind: fieldBind, ...fieldRest }) => withValueBinding(fieldRest, fieldBind))(field)
        : field
    );
  }
  return INPUT_TYPES.has(type) ? withValueBinding(props, bind) : props;
};

const fromProps = (type: string, props: JsonObject, errors: string[]): JsonObject => {
  const { value, fields, ...rest } = props;
  const interpolated = INTERPOLATED_PROPS[type] ?? [];

  const restored: JsonObject = {};
  Object.entries(rest).forEach(([property, inner]) => {
    if (/^on[A-Z]/.test(property)) restored[property] = fromAction(inner);
    else if (property === 'visibleWhen') restored[property] = fromVisibleWhen(inner) as Json;
    else if (interpolated.includes(property)) {
      restored[property] = fromFormatString(inner, errors) as Json;
    } else restored[property] = fromBindings(inner) as Json;
  });

  const withBind =
    INPUT_TYPES.has(type) && isBinding(value)
      ? { ...restored, bind: fromPath(value.path) }
      : value === undefined
      ? restored
      : { ...restored, value: fromBindings(value) as Json };

  return Array.isArray(fields)
    ? {
        ...withBind,
        fields: fields.map((field): Json => {
          if (!isObject(field)) return field;
          const { value: fieldValue, ...fieldRest } = field;
          return isBinding(fieldValue)
            ? { ...(fromBindings(fieldRest) as JsonObject), bind: fromPath(fieldValue.path) }
            : (fromBindings(field) as Json);
        }),
      }
    : withBind;
};

/** What the values of the app are when the surface starts, which is the data model of the surface. */
const toDataModel = (state: AppDocument['state']): JsonObject =>
  Object.fromEntries(
    Object.entries(state).map(([key, { default: value }]) => [key, value as Json])
  );

const fromDataModel = (model: unknown): AppDocument['state'] =>
  Object.fromEntries(
    Object.entries(isObject(model) ? model : {}).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? { type: 'list', default: value }
        : typeof value === 'number'
        ? { type: 'number', default: value }
        : typeof value === 'boolean'
        ? { type: 'boolean', default: value }
        : { type: 'string', default: String(value) },
    ])
  ) as AppDocument['state'];

/** What a button does when nothing is asked of it: A2UI wants an action for every button. */
const NO_ACTION: JsonObject = { functionCall: { call: 'sequence', args: { actions: [] } } };

const collectComponents = (
  node: AppNode,
  rootId: string,
  out: A2uiComponent[],
  taken: Set<string>
): void => {
  const id = node.id === rootId ? 'root' : node.id;
  const children = getNodeChildren(node);
  const childIds = children.map((child) => child.id);
  const props = toProps(node);
  const recurse = (nodes: readonly AppNode[]) =>
    nodes.forEach((child) => collectComponents(child, rootId, out, taken));
  /** The id of a component that is made for a node, which no node has. */
  const madeFor = (suffix: string): string => {
    let made = `${node.id}-${suffix}`;
    while (taken.has(made)) made = `${made}-x`;
    taken.add(made);
    return made;
  };

  // Where a component of the basic catalog means what the node means, it is that component.
  switch (node.type) {
    case 'stack': {
      const { direction, ...rest } = props;
      out.push({
        id,
        component: direction === 'horizontal' ? 'Row' : 'Column',
        ...rest,
        children: childIds,
      } as A2uiComponent);
      return recurse(children);
    }
    case 'heading':
    case 'text':
      out.push({
        id,
        component: 'Text',
        ...props,
        variant: node.type === 'heading' ? 'h3' : 'body',
      } as A2uiComponent);
      return undefined;
    case 'switch':
      out.push({ id, component: 'CheckBox', ...props } as A2uiComponent);
      return undefined;
    case 'search':
      out.push({ id, component: 'TextField', ...props, variant: 'shortText' } as A2uiComponent);
      return undefined;
    case 'button': {
      const { onClick, label, ...rest } = props;
      const labelId = madeFor('label');
      out.push({
        id,
        component: 'Button',
        ...rest,
        child: labelId,
        action: onClick ?? NO_ACTION,
      } as A2uiComponent);
      out.push({ id: labelId, component: 'Text', text: node.label, variant: 'body' });
      return undefined;
    }
    case 'card': {
      const bodyId = madeFor('body');
      out.push({ id, component: 'Card', ...props, child: bodyId } as A2uiComponent);
      out.push({ id: bodyId, component: 'Column', children: childIds });
      return recurse(children);
    }
    case 'tabs': {
      const sections = children.flatMap((child) => (child.type === 'section' ? [child] : []));
      out.push({
        id,
        component: 'Tabs',
        ...props,
        tabs: sections.map((section) => ({
          title: toFormatString(section.label),
          child: section.id,
        })),
      } as A2uiComponent);
      sections.forEach((section) => {
        const { label, open, ...sectionProps } = toProps(section);
        out.push({
          id: section.id,
          component: 'Column',
          ...sectionProps,
          children: getNodeChildren(section).map((inner) => inner.id),
        } as A2uiComponent);
        recurse(getNodeChildren(section));
      });
      return undefined;
    }
    default: {
      const isContainer = children.length > 0 || 'children' in node;
      out.push({
        id,
        component: toComponentName(node.type),
        ...props,
        ...(isContainer ? { children: childIds } : {}),
      } as A2uiComponent);
      return recurse(children);
    }
  }
};

const collectIds = (node: AppNode, ids: Set<string>): void => {
  ids.add(node.id);
  getNodeChildren(node).forEach((child) => collectIds(child, ids));
};

/**
 * A document as the messages that make a surface in A2UI: the surface, with its catalog, its data
 * model, which is the values of the app, and its components, as a flat list that refers to
 * its children by their ids.
 */
export const toA2uiMessages = (document: AppDocument, surfaceId = 'custom-app'): A2uiMessage[] => {
  const components: A2uiComponent[] = [];
  const taken = new Set<string>();
  collectIds(document.root, taken);
  collectComponents(document.root, document.root.id, components, taken);
  if (document.root.id !== 'root' && components.some(({ id }, i) => i > 0 && id === 'root')) {
    throw new Error(
      'A component other than the root is called "root", which A2UI keeps for the root.'
    );
  }

  return [
    {
      version: A2UI_VERSION,
      createSurface: {
        surfaceId,
        catalogId: CUSTOM_APP_CATALOG_ID,
        ...(document.theme ? { theme: toBindings(document.theme) as JsonObject } : {}),
      },
    },
    {
      version: A2UI_VERSION,
      updateDataModel: { surfaceId, path: '/', value: toDataModel(document.state) },
    },
    { version: A2UI_VERSION, updateComponents: { surfaceId, components } },
  ];
};

export type FromA2uiResult = { ok: true; document: AppDocument } | { ok: false; errors: string[] };

/**
 * The document that messages of a surface make, if they are of this catalog and make one that is
 * valid: what is wrong is returned, in words, as the document is checked as any other is.
 */
export const fromA2uiMessages = (messages: readonly A2uiMessage[]): FromA2uiResult => {
  const errors: string[] = [];
  const surface = messages.flatMap((message) =>
    'createSurface' in message ? [message.createSurface] : []
  )[0];
  if (!surface) return { ok: false, errors: ['There is no createSurface message.'] };
  if (surface.catalogId !== CUSTOM_APP_CATALOG_ID) {
    return { ok: false, errors: [`The catalog "${surface.catalogId}" is not one this app knows.`] };
  }

  const components = new Map(
    messages
      .flatMap((message) =>
        'updateComponents' in message ? message.updateComponents.components : []
      )
      .map((component) => [component.id, component])
  );
  const model = messages.flatMap((message) =>
    'updateDataModel' in message && message.updateDataModel.path === '/'
      ? [message.updateDataModel.value]
      : []
  )[0];

  const seen = new Set<string>();
  /** Takes a component for use, once: what is used twice or not at all is an error. */
  const take = (id: string): A2uiComponent | undefined => {
    const component = components.get(id);
    if (!component) {
      errors.push(`The component "${id}" is used and not defined.`);
      return undefined;
    }
    if (seen.has(id)) {
      errors.push(`The component "${id}" is used more than once.`);
      return undefined;
    }
    seen.add(id);
    return component;
  };
  const childrenOf = (component: A2uiComponent): string[] => {
    if (Array.isArray(component.children)) return component.children.map(String);
    if (component.children !== undefined) {
      errors.push(
        `The component "${component.id}" lists its children by a template, which this app does not draw.`
      );
    }
    return [];
  };
  const asNodes = (ids: string[]): JsonObject[] =>
    ids.map((child) => build(child)).filter((node): node is JsonObject => node !== undefined);

  /** What a text component says, when it is a text and not a value. */
  const textOf = (component: A2uiComponent | undefined, what: string): string => {
    const value = component?.text;
    if (typeof value === 'string') return value;
    errors.push(`${what} needs a text that is written, not one that reads values.`);
    return '';
  };

  const build = (id: string): JsonObject | undefined => {
    const component = take(id);
    return component ? buildComponent(component) : undefined;
  };

  /** The node a component is, with what is under it; the component is already taken. */
  function buildComponent(component: A2uiComponent): JsonObject {
    const { id, component: name, children, ...props } = component;
    const make = (
      type: string,
      extra: JsonObject = {},
      from: JsonObject = props as JsonObject
    ) => ({
      type,
      id,
      ...fromProps(type, from, errors),
      ...extra,
    });

    switch (name) {
      case 'Row':
      case 'Column': {
        const { justify: _justify, align: _align, ...rest } = props as JsonObject;
        return make(
          'stack',
          {
            direction: name === 'Row' ? 'horizontal' : 'vertical',
            children: asNodes(childrenOf(component)),
          },
          rest
        );
      }
      case 'Text': {
        const { variant, ...rest } = props as JsonObject;
        return make(
          typeof variant === 'string' && /^h[1-5]$/.test(variant) ? 'heading' : 'text',
          {},
          rest
        );
      }
      case 'CheckBox':
        return make('switch');
      case 'TextField': {
        const { variant, ...rest } = props as JsonObject;
        if (variant !== undefined && variant !== 'shortText') {
          errors.push(
            `The text field "${id}" is of the kind "${String(
              variant
            )}", which this app does not draw.`
          );
        }
        return make('search', {}, rest);
      }
      case 'Button': {
        const { child, action, ...rest } = props as JsonObject;
        const label = textOf(
          typeof child === 'string' ? take(child) : undefined,
          `The button "${id}"`
        );
        return {
          type: 'button',
          id,
          ...fromProps('button', rest, errors),
          label,
          onClick: fromAction(action),
        };
      }
      case 'Card': {
        const { child, ...rest } = props as JsonObject;
        const body = typeof child === 'string' ? take(child) : undefined;
        // What a card holds is one component: a column of what it holds, or the component itself.
        const held = !body
          ? []
          : body.component === 'Column'
          ? asNodes(childrenOf(body))
          : [buildComponent(body)];
        return make('card', { children: held }, rest);
      }
      case 'Tabs': {
        const { tabs, ...rest } = props as JsonObject;
        const sections = (Array.isArray(tabs) ? tabs : []).flatMap((tab, index): JsonObject[] => {
          if (!isObject(tab) || typeof tab.child !== 'string') return [];
          const content = take(tab.child);
          if (!content) return [];
          const column = content.component === 'Column';
          const { children: _c, id: _i, component: _n, ...columnProps } = content;
          return [
            {
              type: 'section',
              id: column ? content.id : `${id}-tab-${index + 1}`,
              ...fromProps(
                'section',
                {
                  ...(column ? (columnProps as JsonObject) : {}),
                  label: tab.title as Json,
                },
                errors
              ),
              children: column ? asNodes(childrenOf(content)) : [buildComponent(content)],
            },
          ];
        });
        return make('tabs', { children: sections }, rest);
      }
      default: {
        const type = toNodeType(name);
        return {
          type,
          id,
          ...fromProps(type, props as JsonObject, errors),
          ...(Array.isArray(children) ? { children: asNodes(childrenOf(component)) } : {}),
        };
      }
    }
  }

  const root = build('root');
  // What could not be read is said first, and alone: what is left of it would only add to it.
  if (!root || errors.length > 0) return { ok: false, errors };

  const parsed = appDocumentSchema.safeParse({
    state: fromDataModel(model),
    ...(surface.theme ? { theme: fromBindings(surface.theme) } : {}),
    root,
  });
  return parsed.success
    ? errors.length === 0
      ? { ok: true, document: parsed.data }
      : { ok: false, errors }
    : { ok: false, errors: [...errors, ...parsed.error.issues.map(({ message }) => message)] };
};
