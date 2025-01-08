/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getValue,
  setValue,
  hasTemplateSnippet,
  collapseEscapedStrings,
  convertProccesorsToJson,
} from './utils';

describe('get and set values', () => {
  const testObject = Object.freeze([{ onFailure: [{ onFailure: 1 }] }]);
  describe('#getValue', () => {
    it('gets a deeply nested value', () => {
      expect(getValue(['0', 'onFailure', '0', 'onFailure'], testObject)).toBe(1);
    });

    it('empty array for path returns "root" value', () => {
      const result = getValue([], testObject);
      expect(result).toEqual(testObject);
      // Getting does not create a copy
      expect(result).toBe(testObject);
    });
  });

  describe('#setValue', () => {
    it('sets a deeply nested value', () => {
      const result = setValue(['0', 'onFailure', '0', 'onFailure'], testObject, 2);
      expect(result).toEqual([{ onFailure: [{ onFailure: 2 }] }]);
      expect(result).not.toBe(testObject);
    });

    it('returns value if no path was provided', () => {
      setValue([], testObject, 2);
      expect(testObject).toEqual([{ onFailure: [{ onFailure: 1 }] }]);
    });
  });
});

describe('template snippets', () => {
  it('knows when a string contains an invalid template snippet', () => {
    expect(hasTemplateSnippet('')).toBe(false);
    expect(hasTemplateSnippet('{}')).toBe(false);
    expect(hasTemplateSnippet('{{{}}}')).toBe(false);
    expect(hasTemplateSnippet('{{hello}}')).toBe(false);
  });

  it('knows when a string contains a valid template snippet', () => {
    expect(hasTemplateSnippet('{{{hello}}}')).toBe(true);
    expect(hasTemplateSnippet('hello{{{world}}}')).toBe(true);
    expect(hasTemplateSnippet('{{{hello}}}world')).toBe(true);
    expect(hasTemplateSnippet('{{{hello.world}}}')).toBe(true);
  });
});

describe('collapse escaped strings', () => {
  it('returns escaped literal strings', () => {
    expect(collapseEscapedStrings('{"1": """aaa\bbb""", "2": """ccc"""}')).toBe(
      '{"1": "aaa\\bbb", "2": "ccc"}'
    );
  });
});

describe('convert processors to json', () => {
  it('returns converted processors', () => {
    const obj = {
      field1: 'mustNotChange',
      field2: 123,
      field3: '{1: "mustNotChange"}',
      pattern_definitions: '{"1": """aaa"bbb"""}',
      processor: '{"1": """aaa"bbb"""}',
      inference_config: '{"1": """aaa"bbb"""}',
      field_map: '{"1": """aaa"bbb"""}',
      customOptions: '{"customProcessor": """aaa"bbb"""}',
    };

    expect(convertProccesorsToJson(obj)).toEqual({
      field1: 'mustNotChange',
      field2: 123,
      field3: '{1: "mustNotChange"}',
      // eslint-disable-next-line prettier/prettier
      pattern_definitions: { 1: "aaa\"bbb" },
      // eslint-disable-next-line prettier/prettier
      processor: { 1: "aaa\"bbb" },
      // eslint-disable-next-line prettier/prettier
      inference_config: { 1: "aaa\"bbb" },
      // eslint-disable-next-line prettier/prettier
      field_map: { 1: "aaa\"bbb" },
      // eslint-disable-next-line prettier/prettier
      customProcessor: "aaa\"bbb"
    });
  });
});
