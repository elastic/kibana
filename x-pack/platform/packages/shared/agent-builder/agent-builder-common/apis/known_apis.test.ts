/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@elastic/schemas/es/tools/manifest.js', () => ({
  esManifest: [
    { id: 'indices.create' },
    { id: 'indices.delete' },
    { id: 'async-search.delete' },
    { id: 'bulk' },
  ],
}));

jest.mock('@elastic/schemas/kibana/tools/manifest.js', () => ({
  kibanaManifest: [{ id: 'cases.create' }],
}));

import {
  elasticsearchApiSelectors,
  findUnknownApis,
  formatUnknownApis,
  isKnownApiSelector,
  matchesApiSelector,
} from './known_apis';

describe('elasticsearchApiSelectors', () => {
  it('leads with the wildcards, then lists the exact identifiers', () => {
    expect(elasticsearchApiSelectors).toEqual([
      '*',
      'async-search.*',
      'indices.*',
      'indices.create',
      'indices.delete',
      'async-search.delete',
      'bulk',
    ]);
  });

  it('derives no namespace wildcard from an identifier that has no namespace', () => {
    expect(elasticsearchApiSelectors).not.toContain('bulk.*');
  });
});

describe('isKnownApiSelector', () => {
  it('accepts an operation the target ships', () => {
    expect(isKnownApiSelector({ target: 'elasticsearch', api: 'indices.delete' })).toBe(true);
    expect(isKnownApiSelector({ target: 'kibana', api: 'cases.create' })).toBe(true);
  });

  it('accepts the full wildcard and a namespace the target ships', () => {
    expect(isKnownApiSelector({ target: 'elasticsearch', api: '*' })).toBe(true);
    expect(isKnownApiSelector({ target: 'elasticsearch', api: 'indices.*' })).toBe(true);
    expect(isKnownApiSelector({ target: 'kibana', api: 'cases.*' })).toBe(true);
  });

  it('rejects a namespace wildcard that only exists on the other target', () => {
    expect(isKnownApiSelector({ target: 'kibana', api: 'indices.*' })).toBe(false);
    expect(isKnownApiSelector({ target: 'elasticsearch', api: 'cases.*' })).toBe(false);
  });

  it('rejects an operation that only exists on the other target', () => {
    expect(isKnownApiSelector({ target: 'kibana', api: 'indices.delete' })).toBe(false);
    expect(isKnownApiSelector({ target: 'elasticsearch', api: 'cases.create' })).toBe(false);
  });

  it('rejects a bare namespace', () => {
    expect(isKnownApiSelector({ target: 'elasticsearch', api: 'indices' })).toBe(false);
  });

  it('rejects the snake_case spelling of a kebab-case namespace', () => {
    expect(isKnownApiSelector({ target: 'elasticsearch', api: 'async-search.delete' })).toBe(true);
    expect(isKnownApiSelector({ target: 'elasticsearch', api: 'async_search.delete' })).toBe(false);
  });

  it('rejects a typo and an empty identifier', () => {
    expect(isKnownApiSelector({ target: 'elasticsearch', api: 'indices.crate' })).toBe(false);
    expect(isKnownApiSelector({ target: 'elasticsearch', api: '' })).toBe(false);
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

describe('findUnknownApis', () => {
  it('returns only the invalid entries, in input order', () => {
    expect(
      findUnknownApis([
        { target: 'elasticsearch', api: 'indices.crate' },
        { target: 'elasticsearch', api: 'indices.create' },
        { target: 'elasticsearch', api: 'indices.*' },
        { target: 'kibana', api: 'indices.delete' },
      ])
    ).toEqual([
      { target: 'elasticsearch', api: 'indices.crate' },
      { target: 'kibana', api: 'indices.delete' },
    ]);
  });

  it('returns an empty list when every entry is valid', () => {
    expect(
      findUnknownApis([
        { target: 'elasticsearch', api: 'indices.create' },
        { target: 'elasticsearch', api: '*' },
        { target: 'kibana', api: 'cases.create' },
      ])
    ).toEqual([]);
  });

  it('returns an empty list for no entries', () => {
    expect(findUnknownApis([])).toEqual([]);
  });
});

describe('formatUnknownApis', () => {
  it('renders each entry with its target, in the order supplied', () => {
    expect(
      formatUnknownApis([
        { target: 'elasticsearch', api: 'indices.crate' },
        { target: 'kibana', api: 'indices.delete' },
      ])
    ).toBe('"indices.crate" (elasticsearch), "indices.delete" (kibana)');
  });
});
