/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_INTERACTION_FIELD_LENGTH = 256;
export const MAX_INTERACTION_VALUE_LENGTH = 1024;

/** The only action a template can declare today. Adding one is a reviewed change to this file. */
export interface FilterInteraction {
  action: 'filter';
  /** A column of the panel's current ES|QL result. */
  field: string;
  value: string;
  negate: boolean;
}

export type CustomContentInteraction = FilterInteraction;

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

/**
 * Reads the interaction a click asks for, or undefined when it asks for nothing valid. The content
 * is generated, so every attribute is untrusted input: unknown actions, unknown columns, empty or
 * oversized values and unknown operators are all dropped without a trace for the template.
 */
export const readInteraction = (
  target: unknown,
  columns: ReadonlySet<string>
): CustomContentInteraction | undefined => {
  try {
    const element: Element | null = Element.prototype.closest.call(target, `[${ACTION_ATTRIBUTE}]`);
    if (!element) return undefined;

    switch (getAttribute(element, ACTION_ATTRIBUTE)) {
      case 'filter':
        return parseFilter(element, columns);
      default:
        return undefined;
    }
  } catch {
    // Not an element (a text node, null, anything else): there is nothing to act on.
    return undefined;
  }
};
