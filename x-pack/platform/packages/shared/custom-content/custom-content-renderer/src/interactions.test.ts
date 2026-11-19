/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_INTERACTION_FIELD_LENGTH,
  MAX_INTERACTION_VALUE_LENGTH,
  readInteraction,
} from './interactions';

const columns = new Set(['host.name', 'count']);

type Attributes = Record<string, string>;

const FILTER_HOST: Attributes = {
  'data-cc-action': 'filter',
  'data-cc-field': 'host.name',
  'data-cc-value': 'a',
};

// Built with the DOM API, not by parsing a string: the attributes are test input, and nothing here
// should turn a string into markup.
const createElementWith = (doc: Document, tag: string, attributes: Attributes) => {
  const element = doc.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
};

/** The span inside a button that carries the attributes, which is where a click lands. */
const render = (attributes: Attributes) => {
  const doc = document.implementation.createHTMLDocument('');
  const button = createElementWith(doc, 'button', attributes);
  const inner = createElementWith(doc, 'span', {});
  button.append(inner);
  doc.body.append(button);
  return inner;
};

describe('readInteraction', () => {
  it('reads a filter from the element, or from a descendant of it', () => {
    expect(readInteraction(render(FILTER_HOST), columns)).toEqual({
      action: 'filter',
      field: 'host.name',
      value: 'a',
      negate: false,
    });
  });

  it('negates with is_not', () => {
    const target = render({ ...FILTER_HOST, 'data-cc-op': 'is_not' });
    expect(readInteraction(target, columns)?.negate).toBe(true);
  });

  it.each<[string, Attributes]>([
    ['an unknown action', { ...FILTER_HOST, 'data-cc-action': 'navigate' }],
    ['a column the query did not return', { ...FILTER_HOST, 'data-cc-field': 'user.id' }],
    ['a missing value', { 'data-cc-action': 'filter', 'data-cc-field': 'host.name' }],
    ['an empty value', { ...FILTER_HOST, 'data-cc-value': '' }],
    ['a missing field', { 'data-cc-action': 'filter', 'data-cc-value': 'a' }],
    ['an unknown operator', { ...FILTER_HOST, 'data-cc-op': 'gt' }],
    [
      'an oversized value',
      { ...FILTER_HOST, 'data-cc-value': 'a'.repeat(MAX_INTERACTION_VALUE_LENGTH + 1) },
    ],
  ])('drops %s', (_, attributes) => {
    expect(readInteraction(render(attributes), columns)).toBeUndefined();
  });

  it('drops an oversized field name even when it is a column', () => {
    const field = 'f'.repeat(MAX_INTERACTION_FIELD_LENGTH + 1);
    const target = render({ ...FILTER_HOST, 'data-cc-field': field });
    expect(readInteraction(target, new Set([field]))).toBeUndefined();
  });

  it.each(['constructor', '__proto__'])(
    'does not treat the inherited key %s as an action',
    (action) => {
      const target = render({ ...FILTER_HOST, 'data-cc-action': action });
      expect(readInteraction(target, columns)).toBeUndefined();
    }
  );

  it('accepts only the actions the host allows', () => {
    const target = render(FILTER_HOST);
    expect(readInteraction(target, columns, ['filter'])).toBeDefined();
    expect(readInteraction(target, columns, [])).toBeUndefined();
  });

  it('ignores a click outside any action, and non-element targets', () => {
    expect(readInteraction(render({}), columns)).toBeUndefined();
    expect(readInteraction(null, columns)).toBeUndefined();
    expect(readInteraction({ nodeType: 1 }, columns)).toBeUndefined();
    expect(readInteraction(document.createTextNode('x'), columns)).toBeUndefined();
  });

  it('still reads an element whose own methods a child tries to replace', () => {
    // Browsers let `<input name="getAttribute">` shadow the method on a form; jsdom does not, so
    // the shadowing is done by hand. This must hold even if the sanitizer ever let such a name by.
    const doc = document.implementation.createHTMLDocument('');
    const form = createElementWith(doc, 'form', FILTER_HOST);
    doc.body.append(form);
    ['getAttribute', 'closest'].forEach((name) =>
      Object.defineProperty(form, name, { value: doc.createElement('input') })
    );

    expect(typeof form.getAttribute).not.toBe('function');
    expect(readInteraction(form, columns)).toEqual({
      action: 'filter',
      field: 'host.name',
      value: 'a',
      negate: false,
    });
  });
});
