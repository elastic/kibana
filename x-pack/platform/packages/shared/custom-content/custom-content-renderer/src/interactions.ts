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

const ACTION_ATTRIBUTE = 'data-cc-action';

// The frame's document is untrusted input, so nothing is read through the node's own properties:
// a form holding `<input name="getAttribute">` would replace that method with an element. The
// prototype methods are called on the node instead. They also check that the node really is an
// element, across realms, which `instanceof` cannot do for a frame.
const getAttribute = (element: Element, name: string): string | null =>
  Element.prototype.getAttribute.call(element, name);

const parseFilter = (
  element: Element,
  columns: ReadonlySet<string>
): FilterInteraction | undefined => {
  const field = getAttribute(element, 'data-cc-field');
  const value = getAttribute(element, 'data-cc-value');
  const operator = getAttribute(element, 'data-cc-op') ?? 'is';

  if (field === null || value === null) return undefined;
  if (field.length === 0 || field.length > MAX_INTERACTION_FIELD_LENGTH) return undefined;
  if (value.length === 0 || value.length > MAX_INTERACTION_VALUE_LENGTH) return undefined;
  if (operator !== 'is' && operator !== 'is_not') return undefined;
  // A template may only filter on what its own query returned.
  if (!columns.has(field)) return undefined;

  return { action: 'filter', field, value, negate: operator === 'is_not' };
};

type Parser<A extends CustomContentInteractionAction> = (
  element: Element,
  columns: ReadonlySet<string>
) => Extract<CustomContentInteraction, { action: A }> | undefined;

// Typed as a mapped type over the actions, so an action without a parser does not compile.
const PARSERS: { [A in CustomContentInteractionAction]: Parser<A> } = {
  filter: parseFilter,
};

// `in` would also match inherited keys such as `constructor` or `__proto__`.
const isAction = (value: string | null): value is CustomContentInteractionAction =>
  value !== null && Object.prototype.hasOwnProperty.call(PARSERS, value);

/**
 * Reads the interaction a click asks for, or undefined when it asks for nothing valid. The content
 * is generated, so every attribute is untrusted input: unknown actions, unknown columns, empty or
 * oversized values and unknown operators are all dropped without a trace for the template.
 * `allowedActions` lets a host accept fewer actions than exist; leave it out to accept them all.
 */
export const readInteraction = (
  target: unknown,
  columns: ReadonlySet<string>,
  allowedActions?: readonly CustomContentInteractionAction[]
): CustomContentInteraction | undefined => {
  try {
    const element: Element | null = Element.prototype.closest.call(target, `[${ACTION_ATTRIBUTE}]`);
    if (!element) return undefined;

    const action = getAttribute(element, ACTION_ATTRIBUTE);
    if (!isAction(action)) return undefined;
    if (allowedActions && !allowedActions.includes(action)) return undefined;
    return PARSERS[action](element, columns);
  } catch {
    // Not an element (a text node, null, anything else): there is nothing to act on.
    return undefined;
  }
};
