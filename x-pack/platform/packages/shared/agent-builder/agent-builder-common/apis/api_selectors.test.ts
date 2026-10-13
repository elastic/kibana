/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isApiWildcardSelector,
  matchesApiSelector,
  toApiNamespace,
  toNamespaceSelector,
} from './api_selectors';

describe('toApiNamespace', () => {
  it('reads the namespace before the first dot', () => {
    expect(toApiNamespace('indices.delete')).toBe('indices');
    expect(toApiNamespace('agent-builder.put-agent-builder-agents-id')).toBe('agent-builder');
  });

  it('finds no namespace in an identifier without a dot', () => {
    expect(toApiNamespace('bulk')).toBeUndefined();
  });
});

describe('toNamespaceSelector', () => {
  it('builds the wildcard that matches every operation of the namespace', () => {
    const selector = toNamespaceSelector('indices');

    expect(selector).toBe('indices.*');
    expect(matchesApiSelector(selector, 'indices.delete')).toBe(true);
  });
});

describe('isApiWildcardSelector', () => {
  it('recognizes the full wildcard and a namespace wildcard', () => {
    expect(isApiWildcardSelector('*')).toBe(true);
    expect(isApiWildcardSelector('indices.*')).toBe(true);
  });

  it('does not treat an exact identifier or a bare namespace as a wildcard', () => {
    expect(isApiWildcardSelector('indices.delete')).toBe(false);
    expect(isApiWildcardSelector('indices')).toBe(false);
  });
});

describe('matchesApiSelector', () => {
  it('matches an exact identifier', () => {
    expect(matchesApiSelector('indices.create', 'indices.create')).toBe(true);
    expect(matchesApiSelector('indices.create', 'indices.delete')).toBe(false);
  });

  it('matches every operation under a namespace wildcard', () => {
    expect(matchesApiSelector('indices.*', 'indices.create')).toBe(true);
    expect(matchesApiSelector('indices.*', 'indices.delete')).toBe(true);
  });

  it('does not let a namespace wildcard reach another namespace or a bare identifier', () => {
    expect(matchesApiSelector('indices.*', 'cases.create')).toBe(false);
    expect(matchesApiSelector('indices.*', 'bulk')).toBe(false);
    expect(matchesApiSelector('indices.*', 'indices')).toBe(false);
  });

  it('does not treat a namespace wildcard as a bare prefix', () => {
    expect(matchesApiSelector('indices.*', 'indices_v2.create')).toBe(false);
  });

  it('matches everything under the full wildcard', () => {
    expect(matchesApiSelector('*', 'indices.create')).toBe(true);
    expect(matchesApiSelector('*', 'bulk')).toBe(true);
  });

  it('does not treat a bare namespace as a wildcard', () => {
    expect(matchesApiSelector('indices', 'indices.create')).toBe(false);
  });
});
