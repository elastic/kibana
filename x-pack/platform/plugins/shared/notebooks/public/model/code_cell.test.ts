/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatCodeValue,
  getCodeExports,
  getCodeReferences,
  renameCodeReference,
  runCode,
} from './code_cell';

describe('getCodeExports', () => {
  it('lists exported declarations and export lists, renamed or not', () => {
    const code = [
      'export const total = 1;',
      'export let mutable = 2;',
      'export function double(x) { return x * 2; }',
      'export async function* stream() {}',
      'export class Thing {}',
      'const a = 1, b = 2;',
      'export { a, b as bee };',
    ].join('\n');
    expect(getCodeExports(code)).toEqual([
      'total',
      'mutable',
      'double',
      'stream',
      'Thing',
      'a',
      'bee',
    ]);
  });

  it('ignores `export` in strings, comments and property names', () => {
    const code = "// export const no = 1\nconst s = 'export const nope = 2'; obj.export = 3;";
    expect(getCodeExports(code)).toEqual([]);
  });
});

describe('getCodeReferences', () => {
  it('lists the free identifiers the code reads', () => {
    expect(getCodeReferences('const total = rows.length + country.length;')).toEqual([
      'rows',
      'country',
    ]);
  });

  it('skips property access, object keys, declarations, strings, comments and regexes', () => {
    const code = [
      '// country',
      'const label = "country";',
      'const re = /country/g;',
      'const point = { country: 1, other: limit };',
      'function format(value) { return value.country; }',
      'class Box {}',
      'export const shown = point?.country;',
    ].join('\n');
    expect(getCodeReferences(code)).toEqual(['limit', 'value']);
  });

  it('reads identifiers inside template literal expressions only', () => {
    expect(getCodeReferences('const text = `country ${country} and ${`${nested}`}`;')).toEqual([
      'country',
      'nested',
    ]);
  });
});

describe('renameCodeReference', () => {
  it('renames references but not properties, keys, strings or other names', () => {
    const code = 'const x = country + obj.country + { country: 1 } + "country" + countryCode;';
    expect(renameCodeReference(code, 'country', 'nation')).toBe(
      'const x = nation + obj.country + { country: 1 } + "country" + countryCode;'
    );
  });
});

describe('runCode', () => {
  const signal = new AbortController().signal;

  afterEach(() => jest.restoreAllMocks());

  it('returns the exported values, with inputs injected as root constants', async () => {
    const code = [
      'export const total = rows.reduce((sum, row) => sum + row.count, 0);',
      'const label = `${country}: ${total}`;',
      'export { label as summary };',
    ].join('\n');
    const result = await runCode({
      code,
      inputs: { rows: [{ count: 2 }, { count: 3 }], country: 'CA' },
      signal,
    });
    expect(result.error).toBeUndefined();
    expect(result.values).toEqual({ total: 5, summary: 'CA: 5' });
  });

  it('keeps inputs constant but lets the code shadow them', async () => {
    const reassigned = await runCode({ code: 'limit = 2;', inputs: { limit: 1 }, signal });
    expect(reassigned.error).toMatch(/constant/i);
    const shadowed = await runCode({
      code: 'const limit = 5; export const doubled = limit * 2;',
      inputs: { limit: 1 },
      signal,
    });
    expect(shadowed.values).toEqual({ doubled: 10 });
  });

  it('supports top-level await', async () => {
    const result = await runCode({
      code: 'export const value = await Promise.resolve(7);',
      inputs: {},
      signal,
    });
    expect(result.values).toEqual({ value: 7 });
  });

  it('captures console output, formatting non-string values', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await runCode({
      code: "console.log('rows', [1, 2], { a: 1 }); console.warn('careful');",
      inputs: {},
      signal,
    });
    expect(result.logs).toEqual([
      { level: 'log', message: 'rows [1, 2] {a: 1}' },
      { level: 'warn', message: 'careful' },
    ]);
  });

  it('reports errors with the logs written before them', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const result = await runCode({
      code: "console.log('before'); throw new Error('boom');",
      inputs: {},
      signal,
    });
    expect(result.error).toBe('boom');
    expect(result.logs).toEqual([{ level: 'log', message: 'before' }]);
  });

  it('reports syntax errors and unsupported default exports', async () => {
    expect((await runCode({ code: 'const = ;', inputs: {}, signal })).error).toBeDefined();
    expect((await runCode({ code: 'export default 1;', inputs: {}, signal })).error).toMatch(
      /default exports/i
    );
  });
});

describe('formatCodeValue', () => {
  it('previews values compactly', () => {
    const circular: { self?: object } = {};
    circular.self = circular;
    expect(formatCodeValue('hi')).toBe('"hi"');
    expect(formatCodeValue(undefined)).toBe('undefined');
    expect(formatCodeValue(function named() {})).toBe('ƒ named()');
    expect(formatCodeValue(new Map([[1, 2]]))).toBe('Map(1)');
    expect(formatCodeValue({ nested: { deep: { deeper: { deepest: 1 } } } })).toBe(
      '{nested: {deep: {deeper: {…}}}}'
    );
    expect(formatCodeValue(circular)).toBe('{self: [Circular]}');
  });
});
