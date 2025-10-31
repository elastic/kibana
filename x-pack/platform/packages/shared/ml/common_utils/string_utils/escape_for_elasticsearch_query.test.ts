/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeForElasticsearchQuery } from './escape_for_elasticsearch_query';

describe('escapeForElasticsearchQuery', () => {
  test('should return correct escaping of reserved elasticsearch characters', () => {
    expect(escapeForElasticsearchQuery('foo+bar')).toBe('foo\\+bar');
    expect(escapeForElasticsearchQuery('foo-bar')).toBe('foo\\-bar');
    expect(escapeForElasticsearchQuery('foo=bar')).toBe('foo\\=bar');
    expect(escapeForElasticsearchQuery('foo&&bar')).toBe('foo\\&\\&bar');
    expect(escapeForElasticsearchQuery('foo||bar')).toBe('foo\\|\\|bar');
    expect(escapeForElasticsearchQuery('foo>bar')).toBe('foo\\>bar');
    expect(escapeForElasticsearchQuery('foo<bar')).toBe('foo\\<bar');
    expect(escapeForElasticsearchQuery('foo!bar')).toBe('foo\\!bar');
    expect(escapeForElasticsearchQuery('foo(bar')).toBe('foo\\(bar');
    expect(escapeForElasticsearchQuery('foo)bar')).toBe('foo\\)bar');
    expect(escapeForElasticsearchQuery('foo{bar')).toBe('foo\\{bar');
    expect(escapeForElasticsearchQuery('foo[bar')).toBe('foo\\[bar');
    expect(escapeForElasticsearchQuery('foo]bar')).toBe('foo\\]bar');
    expect(escapeForElasticsearchQuery('foo^bar')).toBe('foo\\^bar');
    expect(escapeForElasticsearchQuery('foo"bar')).toBe('foo\\"bar');
    expect(escapeForElasticsearchQuery('foo~bar')).toBe('foo\\~bar');
    expect(escapeForElasticsearchQuery('foo*bar')).toBe('foo\\*bar');
    expect(escapeForElasticsearchQuery('foo?bar')).toBe('foo\\?bar');
    expect(escapeForElasticsearchQuery('foo:bar')).toBe('foo\\:bar');
    expect(escapeForElasticsearchQuery('foo\\bar')).toBe('foo\\\\bar');
    expect(escapeForElasticsearchQuery('foo/bar')).toBe('foo\\/bar');
  });
});
