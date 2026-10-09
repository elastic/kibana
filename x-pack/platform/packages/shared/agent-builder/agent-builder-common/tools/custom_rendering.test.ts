/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCustomElementAttribute, splitCustomElements } from './custom_rendering';

describe('getCustomElementAttribute', () => {
  it('reads an attribute of a tag', () => {
    expect(getCustomElementAttribute('<render_attachment id="a1" version="2" />', 'version')).toBe(
      '2'
    );
  });

  it('does not read a longer attribute name that ends with the same name', () => {
    expect(getCustomElementAttribute('<render_attachment field-id="x" id="a1" />', 'id')).toBe(
      'a1'
    );
    expect(getCustomElementAttribute('<render_attachment field-id="x" />', 'id')).toBeUndefined();
  });
});

describe('splitCustomElements', () => {
  it('splits text around tags, in order, including tags inline with prose', () => {
    expect(
      splitCustomElements(
        'Rule: <render_attachment id="a1"/> done\n\n<RENDER_ATTACHMENT id="a2">',
        'render_attachment'
      )
    ).toEqual([
      { type: 'text', text: 'Rule: ' },
      { type: 'element', tag: '<render_attachment id="a1"/>' },
      { type: 'text', text: ' done\n\n' },
      { type: 'element', tag: '<RENDER_ATTACHMENT id="a2">' },
    ]);
  });

  it('drops whitespace-only text between tags', () => {
    expect(
      splitCustomElements('<render id="a" />\n\n<render id="b" />', 'render').map(
        ({ type }) => type
      )
    ).toEqual(['element', 'element']);
  });

  it('does not match tags whose name only starts with the given name', () => {
    expect(splitCustomElements('<render_attachment id="a1" />', 'render')).toEqual([
      { type: 'text', text: '<render_attachment id="a1" />' },
    ]);
  });

  it('returns the text alone when it has no tags', () => {
    expect(splitCustomElements('Hello', 'render')).toEqual([{ type: 'text', text: 'Hello' }]);
  });
});
