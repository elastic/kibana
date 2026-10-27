/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchApis } from './search_apis';
import type { ApiRegistry, ApiRegistryMeta } from './types';

const createMeta = (overrides: Partial<ApiRegistryMeta> = {}): ApiRegistryMeta => ({
  id: 'indices.create',
  name: 'create',
  namespace: 'indices',
  description: 'Create an index',
  namespaceFile: 'indices',
  destructive: false,
  readOnly: false,
  ...overrides,
});

const createRegistry = (manifest: ApiRegistryMeta[]): ApiRegistry => ({
  manifest,
  loadApi: jest.fn(),
});

const registry = createRegistry([
  createMeta(),
  createMeta({
    id: 'bulk',
    name: 'bulk',
    namespace: null,
    description: 'Perform multiple index/create/delete operations',
  }),
  createMeta({
    id: 'cluster.health',
    name: 'health',
    namespace: 'cluster',
    description: 'Return the health status of the cluster',
  }),
]);

describe('searchApis', () => {
  it('summarizes the matching operations', () => {
    expect(searchApis(registry, 'cluster health')).toEqual([
      {
        api: 'cluster.health',
        name: 'health',
        namespace: 'cluster',
        description: 'Return the health status of the cluster',
      },
    ]);
  });

  it('ranks matches by relevance rather than manifest order', () => {
    expect(searchApis(registry, 'INDICES create').map(({ api }) => api)).toEqual([
      'indices.create',
      'bulk',
    ]);
  });

  it('caps the returned operations at the limit', () => {
    expect(searchApis(registry, 'create index health', 1)).toHaveLength(1);
  });

  it('returns nothing when no operation matches', () => {
    expect(searchApis(registry, 'no-such-api')).toEqual([]);
    expect(searchApis(registry, '   ')).toEqual([]);
  });

  it('reports a root operation as having no namespace', () => {
    expect(searchApis(registry, 'bulk')).toEqual([
      expect.objectContaining({ api: 'bulk', namespace: null }),
    ]);
  });
});
