/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiSearchIndex, getApiSearchIndex, tokenize } from './search_index';
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

const manifest = [
  createMeta({
    id: 'bulk',
    name: 'bulk',
    namespace: null,
    description: 'Bulk index or delete documents',
  }),
  createMeta(),
  createMeta({ id: 'search', name: 'search', namespace: null, description: 'Run a search' }),
  createMeta({
    id: 'cluster.health',
    name: 'health',
    namespace: 'cluster',
    description: 'Get the cluster health status',
  }),
];

const hitIds = (query: string, limit = 10): string[] =>
  createApiSearchIndex(manifest)
    .search(query, limit)
    .map(({ id }) => id);

describe('tokenize', () => {
  it('lowercases and splits on anything that is not a letter or a digit', () => {
    expect(tokenize('Alerting-V2.post-alerting-v2-rules_bulk Delete!')).toEqual([
      'alerting',
      'v2',
      'post',
      'alerting',
      'v2',
      'rules',
      'bulk',
      'delete',
    ]);
  });

  it('returns no tokens for blank or punctuation-only text', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(' .-_/ ')).toEqual([]);
  });
});

describe('createApiSearchIndex', () => {
  describe('search', () => {
    it('ranks an identifier match above a description match', () => {
      const index = createApiSearchIndex([
        createMeta({
          id: 'msearch',
          name: 'msearch',
          namespace: null,
          description: 'Run a search',
        }),
        createMeta({ id: 'search', name: 'search', namespace: null, description: 'Run a query' }),
      ]);

      expect(index.search('search', 10).map(({ id }) => id)).toEqual(['search', 'msearch']);
    });

    it('ranks the operation whose identifier equals the query first', () => {
      const index = createApiSearchIndex([
        createMeta({
          id: 'search-application.search',
          name: 'search',
          namespace: 'search-application',
          description: 'Run a search against a search application',
        }),
        createMeta({ id: 'search', name: 'search', namespace: null, description: 'Run a query' }),
      ]);

      expect(index.search(' Search ', 10).map(({ id }) => id)).toEqual([
        'search',
        'search-application.search',
      ]);
    });

    it('ranks the operation matching the most words of a natural-language query first', () => {
      expect(hitIds('index many documents at once')[0]).toBe('bulk');
      expect(hitIds('what is the health of my cluster')[0]).toBe('cluster.health');
    });

    it('matches words independently of their order or the field they appear in', () => {
      expect(hitIds('health cluster')).toEqual(['cluster.health']);
    });

    it('returns at most `limit` operations', () => {
      expect(hitIds('index', 1)).toHaveLength(1);
    });

    it('breaks score ties by identifier so results are deterministic', () => {
      const tied = [
        createMeta({ id: 'b.op', name: 'op', namespace: 'b', description: 'same' }),
        createMeta({ id: 'a.op', name: 'op', namespace: 'a', description: 'same' }),
      ];

      expect(
        createApiSearchIndex(tied)
          .search('op same', 10)
          .map(({ id }) => id)
      ).toEqual(['a.op', 'b.op']);
    });

    it('returns nothing when no word of the query is indexed', () => {
      expect(createApiSearchIndex(manifest).search('no-such-thing', 10)).toEqual([]);
      expect(createApiSearchIndex([]).search('anything', 10)).toEqual([]);
    });
  });

  describe('suggest', () => {
    const index = createApiSearchIndex([
      createMeta(),
      createMeta({ id: 'indices.delete', name: 'delete', description: 'Delete an index' }),
      createMeta({
        id: 'agent-builder.get-agent-builder-tools',
        name: 'get-agent-builder-tools',
        namespace: 'agent-builder',
      }),
      createMeta({
        id: 'agent-builder.post-agent-builder-tools',
        name: 'post-agent-builder-tools',
        namespace: 'agent-builder',
      }),
    ]);

    it('suggests the identifier a misspelling is closest to, but not its namespace siblings', () => {
      expect(index.suggest('indices.craete', 5)).toEqual(['indices.create']);
      expect(index.suggest('indeces.create', 5)).toEqual(['indices.create']);
    });

    it('ignores case', () => {
      expect(index.suggest('Indices.Create', 5)).toEqual(['indices.create']);
    });

    it('orders suggestions nearest first and caps them at the limit', () => {
      expect(index.suggest('agent-builder.get-agent-builder-tool', 5)).toEqual([
        'agent-builder.get-agent-builder-tools',
        'agent-builder.post-agent-builder-tools',
      ]);
      expect(index.suggest('agent-builder.get-agent-builder-tool', 1)).toEqual([
        'agent-builder.get-agent-builder-tools',
      ]);
    });

    it('suggests nothing when no identifier is close', () => {
      expect(index.suggest('totally.unknown', 5)).toEqual([]);
    });
  });
});

describe('getApiSearchIndex', () => {
  it('builds the index once per registry', () => {
    const registry: ApiRegistry = { manifest, loadApi: jest.fn() };
    const otherRegistry: ApiRegistry = { manifest, loadApi: jest.fn() };

    expect(getApiSearchIndex(registry)).toBe(getApiSearchIndex(registry));
    expect(getApiSearchIndex(otherRegistry)).not.toBe(getApiSearchIndex(registry));
  });
});
