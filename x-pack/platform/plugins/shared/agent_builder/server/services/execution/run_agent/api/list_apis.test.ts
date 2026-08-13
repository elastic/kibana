/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listApis } from './list_apis';
import type { ApiRegistryMeta } from './types';

const createMeta = (overrides: Partial<ApiRegistryMeta> = {}): ApiRegistryMeta => ({
  id: 'indices.create',
  name: 'create',
  namespace: 'indices',
  description: 'Create an index',
  namespaceFile: 'indices',
  ...overrides,
});

const manifest = [
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
];

describe('listApis', () => {
  it('summarizes every entry when no search is given', () => {
    expect(listApis(manifest)).toEqual([
      {
        api: 'indices.create',
        name: 'create',
        namespace: 'indices',
        description: 'Create an index',
      },
      {
        api: 'bulk',
        name: 'bulk',
        namespace: null,
        description: 'Perform multiple index/create/delete operations',
      },
      {
        api: 'cluster.health',
        name: 'health',
        namespace: 'cluster',
        description: 'Return the health status of the cluster',
      },
    ]);
  });

  it('treats a blank search as no search at all', () => {
    expect(listApis(manifest, '   ')).toHaveLength(manifest.length);
  });

  it('matches the identifier, name, namespace, and description case-insensitively', () => {
    expect(listApis(manifest, 'INDICES').map(({ api }) => api)).toEqual(['indices.create']);
    expect(listApis(manifest, 'health').map(({ api }) => api)).toEqual(['cluster.health']);
    expect(listApis(manifest, 'multiple index').map(({ api }) => api)).toEqual(['bulk']);
  });

  it('returns nothing when no entry matches', () => {
    expect(listApis(manifest, 'no-such-api')).toEqual([]);
  });

  it('reports a root operation as having no namespace', () => {
    expect(listApis(manifest, 'bulk')).toEqual([
      expect.objectContaining({ api: 'bulk', namespace: null }),
    ]);
  });
});
