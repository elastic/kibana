/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isValidNamespace,
  isValidDataStreamType,
  isValidDataset,
  sanitizeDataset,
} from './is_valid_namespace';

describe('Fleet - isValidNamespace', () => {
  it('returns true for valid namespaces', () => {
    expect(isValidNamespace('default').valid).toBe(true);
    expect(isValidNamespace('123').valid).toBe(true);
    expect(isValidNamespace('testlength😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀').valid).toBe(
      true
    );
    expect(isValidNamespace('', true).valid).toBe(true);
    expect(isValidNamespace('', true, ['test']).valid).toBe(true);
    expect(isValidNamespace('test', false, ['test']).valid).toBe(true);
    expect(isValidNamespace('test_dev', false, ['test']).valid).toBe(true);
  });

  it('returns false for invalid namespaces', () => {
    expect(isValidNamespace('').valid).toBe(false);
    expect(isValidNamespace(' ').valid).toBe(false);
    expect(isValidNamespace('Default').valid).toBe(false);
    expect(isValidNamespace('namespace-with-dash').valid).toBe(false);
    expect(isValidNamespace('namespace with spaces').valid).toBe(false);
    expect(isValidNamespace('foo/bar').valid).toBe(false);
    expect(isValidNamespace('foo\\bar').valid).toBe(false);
    expect(isValidNamespace('foo*bar').valid).toBe(false);
    expect(isValidNamespace('foo?bar').valid).toBe(false);
    expect(isValidNamespace('foo"bar').valid).toBe(false);
    expect(isValidNamespace('foo<bar').valid).toBe(false);
    expect(isValidNamespace('foo|bar').valid).toBe(false);
    expect(isValidNamespace('foo,bar').valid).toBe(false);
    expect(isValidNamespace('foo#bar').valid).toBe(false);
    expect(
      isValidNamespace(
        'testlength😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀'
      ).valid
    ).toBe(false);
    expect(isValidNamespace('default', false, ['test']).valid).toBe(false);
    expect(isValidNamespace('default', false, ['prod', 'qa']).valid).toBe(false);
  });

  it('returns false for whitespace-only namespaces, even when blank namespaces are allowed', () => {
    // Regression test for https://github.com/elastic/kibana/issues/276589 - a whitespace-only
    // namespace (e.g. " ") must not be treated the same as a genuinely blank namespace.
    expect(isValidNamespace(' ', true).valid).toBe(false);
    expect(isValidNamespace('   ', true).valid).toBe(false);
    expect(isValidNamespace(' ', true, ['test']).valid).toBe(false);
  });

  it('accepts a namespace matching any of multiple allowed prefixes', () => {
    expect(isValidNamespace('prod', false, ['prod', 'qa']).valid).toBe(true);
    expect(isValidNamespace('qa', false, ['prod', 'qa']).valid).toBe(true);
    expect(isValidNamespace('prodenv', false, ['prod', 'qa']).valid).toBe(true);
    expect(isValidNamespace('qaenv', false, ['prod', 'qa']).valid).toBe(true);
  });
});

describe('Fleet - isValidDataStreamType', () => {
  it('returns true for each valid type', () => {
    expect(isValidDataStreamType('logs').valid).toBe(true);
    expect(isValidDataStreamType('metrics').valid).toBe(true);
    expect(isValidDataStreamType('traces').valid).toBe(true);
    expect(isValidDataStreamType('synthetics').valid).toBe(true);
    expect(isValidDataStreamType('profiles').valid).toBe(true);
  });

  it('returns false for unknown types', () => {
    expect(isValidDataStreamType('bogus').valid).toBe(false);
    expect(isValidDataStreamType('LOGS').valid).toBe(false);
    expect(isValidDataStreamType('').valid).toBe(false);
    expect(isValidDataStreamType('profiling').valid).toBe(false);
  });

  it('returns true for blank when allowBlank is true', () => {
    expect(isValidDataStreamType('', true).valid).toBe(true);
    expect(isValidDataStreamType('  ', true).valid).toBe(true);
  });

  it('returns false for blank when allowBlank is false', () => {
    expect(isValidDataStreamType('', false).valid).toBe(false);
  });
});

describe('Fleet - sanitizeDataset', () => {
  it('leaves already-valid datasets unchanged', () => {
    expect(sanitizeDataset('my_dataset')).toBe('my_dataset');
    expect(sanitizeDataset('aws_logs.audit')).toBe('aws_logs.audit');
    expect(sanitizeDataset('logs123')).toBe('logs123');
    expect(sanitizeDataset('a')).toBe('a');
  });

  it('lowercases uppercase characters', () => {
    expect(sanitizeDataset('MyDataset')).toBe('mydataset');
    expect(sanitizeDataset('AWS_LOGS')).toBe('aws_logs');
  });

  it('replaces hyphens with underscores', () => {
    expect(sanitizeDataset('my-dataset')).toBe('my_dataset');
    expect(sanitizeDataset('a-b-c')).toBe('a_b_c');
  });

  it('replaces multiple consecutive invalid characters with a single underscore', () => {
    expect(sanitizeDataset('a--b')).toBe('a_b');
    expect(sanitizeDataset('a- -b')).toBe('a_b');
    expect(sanitizeDataset('a#,b')).toBe('a_b');
  });

  it('replaces spaces, commas, hashes, colons, asterisks, and other invalid chars', () => {
    expect(sanitizeDataset('a b')).toBe('a_b');
    expect(sanitizeDataset('a,b')).toBe('a_b');
    expect(sanitizeDataset('a#b')).toBe('a_b');
    expect(sanitizeDataset('a:b')).toBe('a_b');
    expect(sanitizeDataset('a*b')).toBe('a_b');
    expect(sanitizeDataset('a?b')).toBe('a_b');
    expect(sanitizeDataset('a/b')).toBe('a_b');
    expect(sanitizeDataset('a\\b')).toBe('a_b');
  });

  it('strips leading underscores and dots after sanitization', () => {
    expect(sanitizeDataset('-foo')).toBe('foo');
    expect(sanitizeDataset('_foo')).toBe('foo');
    expect(sanitizeDataset('.foo')).toBe('foo');
    expect(sanitizeDataset('---foo')).toBe('foo');
    expect(sanitizeDataset('._-foo')).toBe('foo');
  });

  it('trims surrounding whitespace before sanitizing', () => {
    expect(sanitizeDataset('  my-dataset  ')).toBe('my_dataset');
  });

  it('returns undefined when the result would be empty', () => {
    expect(sanitizeDataset('')).toBeUndefined();
    expect(sanitizeDataset('  ')).toBeUndefined();
    expect(sanitizeDataset('---')).toBeUndefined();
    expect(sanitizeDataset('-')).toBeUndefined();
  });

  it('truncates values longer than 100 bytes', () => {
    const long = 'a'.repeat(200);
    const result = sanitizeDataset(long);
    expect(result).toBeDefined();
    // Verify the result is within bounds
    expect(Buffer.byteLength(result!)).toBeLessThanOrEqual(100);
  });

  it('produces values that always pass isValidDataset', () => {
    const inputs = [
      'my-dataset',
      'AWS_LOGS',
      'a--b',
      '  hello world  ',
      'foo/bar',
      'test:value',
      'UPPER_CASE',
      'mixed-Case_value',
    ];
    for (const input of inputs) {
      const result = sanitizeDataset(input);
      if (result !== undefined) {
        const { valid } = isValidDataset(result, false);
        expect(valid).toBe(true);
      }
    }
  });
});
