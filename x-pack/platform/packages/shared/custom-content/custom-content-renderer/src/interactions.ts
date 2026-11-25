/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_INTERACTION_FIELD_LENGTH = 256;
export const MAX_INTERACTION_VALUE_LENGTH = 1024;

/**
 * What a template can ask a click to do. This file is the reading half of the action registry and
 * the host's `runInteraction` is the running half: a new action is a new member of
 * `CustomContentInteraction`, a parser in `PARSERS` below and a case in the host, and the compiler
 * refuses to build until all three exist. Adding one is a reviewed change, never a template feature.
 */
export interface FilterInteraction {
  action: 'filter';
  /** A column of the panel's current ES|QL result. */
  field: string;
  value: string;
  negate: boolean;
}

export type CustomContentInteraction = FilterInteraction;

export type CustomContentInteractionAction = CustomContentInteraction['action'];

const ATTRIBUTE_PREFIX = 'data-cc-';
const NONCE_PATTERN = /^[0-9a-f]{8,}$/;

/**
 * A random token, made once for each panel that is shown. It scopes the interaction attributes to
 * that panel's template: data cannot know it, so what the data writes into the page cannot be
 * mistaken for what the author wrote.
 */
export const createInteractionNonce = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');

/**
 * Renames `data-cc-` to `data-cc-<nonce>-` in the author's template, before any data is filled in.
 * Authors keep writing `data-cc-action`; `readInteraction` reads only the renamed attributes. Without
 * this, a value that reached the page as markup (any output path that skips escaping) could carry a
 * working `data-cc-action` of its own, however it got there.
 */
export const scopeInteractionAttributes = (template: string, nonce: string): string =>
  template.replaceAll(ATTRIBUTE_PREFIX, `${ATTRIBUTE_PREFIX}${nonce}-`);

// The frame's document is untrusted input, so nothing is read through the node's own properties:
// a form holding `<input name="getAttribute">` would replace that method with an element. The
// prototype methods are called on the node instead. They also check that the node really is an
// element, across realms, which `instanceof` cannot do for a frame.
const getAttribute = (element: Element, name: string): string | null =>
  Element.prototype.getAttribute.call(element, name);

/** Reads an attribute of the clicked element by the name the author wrote, without the prefix. */
type ReadAttribute = (name: 'action' | 'field' | 'value' | 'op') => string | null;

const parseFilter = (
  read: ReadAttribute,
  columns: ReadonlySet<string>
): FilterInteraction | undefined => {
  const field = read('field');
  const value = read('value');
  const operator = read('op') ?? 'is';

  if (field === null || value === null) return undefined;
  if (field.length === 0 || field.length > MAX_INTERACTION_FIELD_LENGTH) return undefined;
  if (value.length === 0 || value.length > MAX_INTERACTION_VALUE_LENGTH) return undefined;
  if (operator !== 'is' && operator !== 'is_not') return undefined;
  // A template may only filter on what its own query returned.
  if (!columns.has(field)) return undefined;

  return { action: 'filter', field, value, negate: operator === 'is_not' };
};

type Parser<A extends CustomContentInteractionAction> = (
  read: ReadAttribute,
  columns: ReadonlySet<string>
) => Extract<CustomContentInteraction, { action: A }> | undefined;

// Typed as a mapped type over the actions, so an action without a parser does not compile.
const PARSERS: { [A in CustomContentInteractionAction]: Parser<A> } = {
  filter: parseFilter,
};

// `in` would also match inherited keys such as `constructor` or `__proto__`.
const isAction = (value: string | null): value is CustomContentInteractionAction =>
  value !== null && Object.prototype.hasOwnProperty.call(PARSERS, value);

export interface ReadInteractionOptions {
  /** The columns the panel's queries returned. */
  columns: ReadonlySet<string>;
  /** The token the template was scoped with, see `scopeInteractionAttributes`. */
  nonce: string;
  /** The actions the host runs; leave it out to accept them all. */
  allowedActions?: readonly CustomContentInteractionAction[];
}

/**
 * Reads the interaction a click asks for, or undefined when it asks for nothing valid. The content
 * is generated, so every attribute is untrusted input: unknown actions, unknown columns, empty or
 * oversized values, unknown operators and attributes without this panel's token are all dropped
 * without a trace for the template.
 */
export const readInteraction = (
  target: unknown,
  { columns, nonce, allowedActions }: ReadInteractionOptions
): CustomContentInteraction | undefined => {
  // The token goes into a selector, so it has to be the kind of token `createInteractionNonce` makes.
  if (!NONCE_PATTERN.test(nonce)) return undefined;
  const attribute = (name: string) => `${ATTRIBUTE_PREFIX}${nonce}-${name}`;

  try {
    // Only a button: it is what the prompt asks for, and a `div` or a `span` is not something a
    // viewer knows they can press.
    const element: Element | null = Element.prototype.closest.call(
      target,
      `button[${attribute('action')}]`
    );
    if (!element) return undefined;

    const read: ReadAttribute = (name) => getAttribute(element, attribute(name));
    const action = read('action');
    if (!isAction(action)) return undefined;
    if (allowedActions && !allowedActions.includes(action)) return undefined;
    return PARSERS[action](read, columns);
  } catch {
    // Not an element (a text node, null, anything else): there is nothing to act on.
    return undefined;
  }
};
