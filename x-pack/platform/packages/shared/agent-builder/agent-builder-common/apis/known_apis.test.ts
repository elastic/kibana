/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@elastic/schemas/es/tools/manifest.js', () => ({
  esManifest: [{ id: 'indices.create' }, { id: 'indices.delete' }, { id: 'async-search.delete' }],
}));

jest.mock('@elastic/schemas/kibana/tools/manifest.js', () => ({
  kibanaManifest: [{ id: 'cases.create' }],
}));

import { findUnknownApis, formatUnknownApis, isKnownApi } from './known_apis';

describe('isKnownApi', () => {
  it('accepts an operation the target ships', () => {
    expect(isKnownApi({ target: 'elasticsearch', api: 'indices.delete' })).toBe(true);
    expect(isKnownApi({ target: 'kibana', api: 'cases.create' })).toBe(true);
  });

  it('rejects an operation that only exists on the other target', () => {
    expect(isKnownApi({ target: 'kibana', api: 'indices.delete' })).toBe(false);
    expect(isKnownApi({ target: 'elasticsearch', api: 'cases.create' })).toBe(false);
  });

  it('rejects a bare namespace', () => {
    expect(isKnownApi({ target: 'elasticsearch', api: 'indices' })).toBe(false);
  });

  it('rejects the snake_case spelling of a kebab-case namespace', () => {
    expect(isKnownApi({ target: 'elasticsearch', api: 'async-search.delete' })).toBe(true);
    expect(isKnownApi({ target: 'elasticsearch', api: 'async_search.delete' })).toBe(false);
  });

  it('rejects a typo and an empty identifier', () => {
    expect(isKnownApi({ target: 'elasticsearch', api: 'indices.crate' })).toBe(false);
    expect(isKnownApi({ target: 'elasticsearch', api: '' })).toBe(false);
  });
});

describe('findUnknownApis', () => {
  it('returns only the invalid entries, in input order', () => {
    expect(
      findUnknownApis([
        { target: 'elasticsearch', api: 'indices.crate' },
        { target: 'elasticsearch', api: 'indices.create' },
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
