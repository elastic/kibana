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

const render = (attributes: string, inner = 'host-1') => {
  const doc = document.implementation.createHTMLDocument('');
  doc.body.innerHTML = `<button ${attributes}><span id="inner">${inner}</span></button>`;
  return doc.getElementById('inner');
};

describe('readInteraction', () => {
  it('reads a filter from the element, or from a descendant of it', () => {
    const target = render('data-cc-action="filter" data-cc-field="host.name" data-cc-value="a"');
    expect(readInteraction(target, columns)).toEqual({
      action: 'filter',
      field: 'host.name',
      value: 'a',
      negate: false,
    });
  });

  it('negates with is_not', () => {
    const target = render(
      'data-cc-action="filter" data-cc-field="host.name" data-cc-value="a" data-cc-op="is_not"'
    );
    expect(readInteraction(target, columns)?.negate).toBe(true);
  });

  it.each([
    ['an unknown action', 'data-cc-action="navigate" data-cc-field="host.name" data-cc-value="a"'],
    [
      'a column the query did not return',
      'data-cc-action="filter" data-cc-field="user.id" data-cc-value="a"',
    ],
    ['a missing value', 'data-cc-action="filter" data-cc-field="host.name"'],
    ['an empty value', 'data-cc-action="filter" data-cc-field="host.name" data-cc-value=""'],
    ['a missing field', 'data-cc-action="filter" data-cc-value="a"'],
    [
      'an unknown operator',
      'data-cc-action="filter" data-cc-field="host.name" data-cc-value="a" data-cc-op="gt"',
    ],
    [
      'an oversized value',
      `data-cc-action="filter" data-cc-field="host.name" data-cc-value="${'a'.repeat(
        MAX_INTERACTION_VALUE_LENGTH + 1
      )}"`,
    ],
  ])('drops %s', (_, attributes) => {
    expect(readInteraction(render(attributes), columns)).toBeUndefined();
  });

  it('drops an oversized field name even when it is a column', () => {
    const field = 'f'.repeat(MAX_INTERACTION_FIELD_LENGTH + 1);
    const target = render(`data-cc-action="filter" data-cc-field="${field}" data-cc-value="a"`);
    expect(readInteraction(target, new Set([field]))).toBeUndefined();
  });

  it('ignores a click outside any action, and non-element targets', () => {
    expect(readInteraction(render(''), columns)).toBeUndefined();
    expect(readInteraction(null, columns)).toBeUndefined();
    expect(readInteraction({ nodeType: 1 }, columns)).toBeUndefined();
    expect(readInteraction(document.createTextNode('x'), columns)).toBeUndefined();
  });

  it('still reads an element whose own methods a child tries to replace', () => {
    // Browsers let `<input name="getAttribute">` shadow the method on a form; jsdom does not, so
    // the shadowing is done by hand. This must hold even if the sanitizer ever let such a name by.
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML =
      '<form id="f" data-cc-action="filter" data-cc-field="host.name" data-cc-value="a"><span id="s"></span></form>';
    const form = doc.getElementById('f')!;
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
