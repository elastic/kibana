/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mlEscape } from './ml_escape';

describe('mlEscape', () => {
  test('should return correct escaping of characters', () => {
    expect(mlEscape('foo&bar')).toBe('foo&amp;bar');
    expect(mlEscape('foo<bar')).toBe('foo&lt;bar');
    expect(mlEscape('foo>bar')).toBe('foo&gt;bar');
    expect(mlEscape('foo"bar')).toBe('foo&quot;bar');
    expect(mlEscape("foo'bar")).toBe('foo&apos;bar');
    expect(mlEscape('foo/bar')).toBe('foo&sol;bar');
    expect(mlEscape('escape © everything ≠ / 𝌆 \\')).toBe(
      'escape&#x20;&copy;&#x20;everything&#x20;&ne;&#x20;&sol;&#x20;&#xD834;&#xDF06;&#x20;&#x5C;'
    );
  });
});
