/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidNamespace, isValidDataStreamType } from './is_valid_namespace';

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
