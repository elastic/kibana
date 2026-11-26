/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_INTERACTION_FIELD_LENGTH,
  MAX_INTERACTION_VALUE_LENGTH,
  createInteractionNonce,
  readInteraction,
  scopeInteractionAttributes,
  type ReadInteractionOptions,
} from './interactions';

const NONCE = '0123456789abcdef';
const columns = new Set(['host.name', 'count']);

type Attributes = Record<string, string>;

// The attributes as the author writes them. The renderer scopes them with the nonce before the data
// is filled in, which `render` does here, so a test reads like a template.
const FILTER_HOST: Attributes = {
  'data-cc-action': 'filter',
  'data-cc-field': 'host.name',
  'data-cc-value': 'a',
};

const read = (target: unknown, options: Partial<ReadInteractionOptions> = {}) =>
  readInteraction(target, { columns, nonce: NONCE, ...options });

// Built with the DOM API, not by parsing a string: the attributes are test input, and nothing here
// should turn a string into markup.
const createElementWith = (doc: Document, tag: string, attributes: Attributes) => {
  const element = doc.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
};

const scope = (attributes: Attributes, nonce = NONCE): Attributes =>
  Object.fromEntries(
    Object.entries(attributes).map(([name, value]) => [
      scopeInteractionAttributes(name, nonce),
      value,
    ])
  );

/**
 * The span inside an element (a button unless said) that carries the attributes: where a click
 * lands. They are scoped with the nonce unless `isScoped` is false, which is what data would write.
 */
const render = (
  attributes: Attributes,
  { tag = 'button', isScoped = true, nonce = NONCE } = {}
) => {
  const doc = document.implementation.createHTMLDocument('');
  const button = createElementWith(doc, tag, isScoped ? scope(attributes, nonce) : attributes);
  const inner = createElementWith(doc, 'span', {});
  button.append(inner);
  doc.body.append(button);
  return inner;
};

describe('readInteraction', () => {
  it('reads a filter from the element, or from a descendant of it', () => {
    expect(read(render(FILTER_HOST))).toEqual({
      action: 'filter',
      field: 'host.name',
      value: 'a',
      negate: false,
    });
  });

  it.each(['div', 'span', 'a'])('ignores a %s that carries the attributes', (tag) => {
    expect(read(render(FILTER_HOST, { tag }))).toBeUndefined();
  });

  it('ignores a disabled button, and a click on something inside it', () => {
    // `render` returns the span inside the button, which is where such a click lands.
    expect(read(render({ ...FILTER_HOST, disabled: '' }))).toBeUndefined();
  });

  it('negates with is_not', () => {
    expect(read(render({ ...FILTER_HOST, 'data-cc-op': 'is_not' }))?.negate).toBe(true);
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
    expect(read(render(attributes))).toBeUndefined();
  });

  it('drops an oversized field name even when it is a column', () => {
    const field = 'f'.repeat(MAX_INTERACTION_FIELD_LENGTH + 1);
    const target = render({ ...FILTER_HOST, 'data-cc-field': field });
    expect(read(target, { columns: new Set([field]) })).toBeUndefined();
  });

  it.each(['constructor', '__proto__'])(
    'does not treat the inherited key %s as an action',
    (action) => {
      expect(read(render({ ...FILTER_HOST, 'data-cc-action': action }))).toBeUndefined();
    }
  );

  it('accepts only the actions the host allows', () => {
    const target = render(FILTER_HOST);
    expect(read(target, { allowedActions: ['filter'] })).toBeDefined();
    expect(read(target, { allowedActions: [] })).toBeUndefined();
  });

  describe('the nonce', () => {
    it('ignores attributes written without it, as data that reached the page would write them', () => {
      expect(read(render(FILTER_HOST, { isScoped: false }))).toBeUndefined();
    });

    it('ignores attributes scoped with another nonce', () => {
      const target = render(FILTER_HOST);
      expect(read(target, { nonce: 'fedcba9876543210' })).toBeUndefined();
    });

    // The element carries the malformed token itself, so only the check of the token can refuse it.
    it.each(['', 'short', 'ABCDEF0123456789'])('refuses the malformed nonce %p', (nonce) => {
      expect(read(render(FILTER_HOST, { nonce }), { nonce })).toBeUndefined();
    });

    it('makes a nonce that is hex, long enough, and different every time', () => {
      const [first, second] = [createInteractionNonce(), createInteractionNonce()];
      expect(first).toMatch(/^[0-9a-f]{16}$/);
      expect(second).not.toBe(first);
    });

    it('scopes every attribute of the author, in the markup and in a selector, and nothing else', () => {
      const template =
        '<style>button[data-cc-action]{color:red}</style><button data-cc-action="x" data-cc-field="y">data-cc is text</button>';
      expect(scopeInteractionAttributes(template, NONCE)).toBe(
        `<style>button[data-cc-${NONCE}-action]{color:red}</style><button data-cc-${NONCE}-action="x" data-cc-${NONCE}-field="y">data-cc is text</button>`
      );
    });
  });

  it('leaves other names that start with data-cc- alone, such as a column called that', () => {
    const template =
      '{{ row["data-cc-count"].value }} data-cc-actions data-cc-op="is_not" data-cc-value="v"';
    expect(scopeInteractionAttributes(template, NONCE)).toBe(
      `{{ row["data-cc-count"].value }} data-cc-actions data-cc-${NONCE}-op="is_not" data-cc-${NONCE}-value="v"`
    );
  });

  it('ignores a click outside any action, and non-element targets', () => {
    expect(read(render({}))).toBeUndefined();
    expect(read(null)).toBeUndefined();
    expect(read({ nodeType: 1 })).toBeUndefined();
    expect(read(document.createTextNode('x'))).toBeUndefined();
  });

  it('still reads an element whose own methods have been replaced', () => {
    // A browser lets `<input name="getAttribute">` shadow that method on a form, which jsdom does not
    // do, so the shadowing is done by hand. Forms are removed by the sanitizer and only a button is
    // read, so nothing reachable can be shadowed today; the reader must not depend on that.
    const doc = document.implementation.createHTMLDocument('');
    const button = createElementWith(doc, 'button', scope(FILTER_HOST));
    doc.body.append(button);
    ['getAttribute', 'closest'].forEach((name) =>
      Object.defineProperty(button, name, { value: doc.createElement('input') })
    );

    expect(typeof button.getAttribute).not.toBe('function');
    expect(read(button)).toEqual({
      action: 'filter',
      field: 'host.name',
      value: 'a',
      negate: false,
    });
  });
});
