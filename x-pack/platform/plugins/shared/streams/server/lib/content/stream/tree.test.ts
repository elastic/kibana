/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asTree, mergeTrees } from './tree';
import { testContentPackEntry } from './test.utils';
import { buildResolvers } from './helpers';

describe('content pack tree helpers', () => {
  describe('asTree', () => {
    it('builds a complete tree when includeAll is provided', () => {
      const root = testContentPackEntry({
        name: 'root',
        routing: [
          { destination: 'root.child1', where: { always: {} } },
          { destination: 'root.child2', where: { always: {} } },
        ],
      });
      const child1 = testContentPackEntry({
        name: 'root.child1',
        routing: [{ destination: 'root.child1.nested', where: { always: {} } }],
      });
      const child2 = testContentPackEntry({ name: 'root.child2' });
      const child1Nested = testContentPackEntry({ name: 'root.child1.nested' });

      const tree = asTree({
        root: 'root',
        streams: [root, child1, child2, child1Nested],
        include: { objects: { all: {} } },
      });

      expect(tree.children).toHaveLength(2);
      expect(tree.children[0].name).toEqual('root.child1');
      expect(tree.children[1].name).toEqual('root.child2');
      expect(tree.children[0].children).toHaveLength(1);
      expect(tree.children[0].children[0].name).toEqual('root.child1.nested');
    });

    it('allows nested includeAll', () => {
      const root = testContentPackEntry({
        name: 'root',
        routing: [
          { destination: 'root.child1', where: { always: {} } },
          { destination: 'root.child2', where: { always: {} } },
        ],
      });
      const child1 = testContentPackEntry({
        name: 'root.child1',
        routing: [{ destination: 'root.child1.nested', where: { always: {} } }],
      });
      const child2 = testContentPackEntry({ name: 'root.child2' });
      const child1Nested = testContentPackEntry({
        name: 'root.child1.nested',
        queries: [{ id: 'keep', title: 'keep query', kql: { query: 'keep' } }],
      });

      const tree = asTree({
        root: 'root',
        streams: [root, child1, child2, child1Nested],
        include: {
          objects: {
            queries: [],
            routing: [{ destination: 'root.child1', objects: { all: {} } }],
          },
        },
      });

      expect(tree.children).toHaveLength(1);
      expect(tree.request.stream.ingest.wired.routing).toEqual([
        { destination: 'root.child1', where: { always: {} } },
      ]);
      expect(tree.children[0].name).toEqual('root.child1');
      expect(tree.children[0].request.stream.ingest.wired.routing).toEqual([
        { destination: 'root.child1.nested', where: { always: {} } },
      ]);
      expect(tree.children[0].children).toHaveLength(1);
      expect(tree.children[0].children[0].name).toEqual('root.child1.nested');
      expect(tree.children[0].children[0].request.queries).toEqual([
        { id: 'keep', title: 'keep query', kql: { query: 'keep' } },
      ]);
    });

    it('filters streams and queries according to include spec', () => {
      const root = testContentPackEntry({
        name: 'root',
        queries: [
          { id: 'keep', title: 'keep query', kql: { query: 'keep' } },
          { id: 'drop', title: 'drop query', kql: { query: 'drop' } },
        ],
      });

      const tree = asTree({
        root: 'root',
        streams: [root],
        include: {
          objects: {
            queries: [{ id: 'keep' }],
            routing: [],
          },
        },
      });

      expect(tree.request.queries).toEqual([
        { id: 'keep', title: 'keep query', kql: { query: 'keep' } },
      ]);
    });

    it('throws when included stream or query do not exist', () => {
      const root = testContentPackEntry({
        name: 'root',
        routing: [{ destination: 'root.child1', where: { always: {} } }],
      });
      const child1 = testContentPackEntry({ name: 'root.child1' });

      expect(() =>
        asTree({
          root: 'root',
          streams: [root, child1],
          include: {
            objects: {
              queries: [],
              routing: [{ destination: 'root.child2', objects: { all: {} } }],
            },
          },
        })
      ).toThrow('Stream [root] does not route to [root.child2]');

      expect(() =>
        asTree({
          root: 'root',
          streams: [root, child1],
          include: {
            objects: {
              queries: [],
              routing: [
                {
                  destination: 'root.child1',
                  objects: { queries: [{ id: 'foo' }], routing: [] },
                },
              ],
            },
          },
        })
      ).toThrow('Stream [root.child1] does not define query [foo]');
    });
  });

  describe('mergeTrees', () => {
    it('merges distinct children and fields', () => {
      const existing = asTree({
        root: 'root',
        streams: [
          testContentPackEntry({
            name: 'root',
            routing: [{ destination: 'root.a', where: { always: {} } }],
            fields: { existing: { type: 'keyword' } },
          }),
          testContentPackEntry({ name: 'root.a' }),
        ],
        include: { objects: { all: {} } },
      });

      const incoming = asTree({
        root: 'root',
        streams: [
          testContentPackEntry({
            name: 'root',
            routing: [{ destination: 'root.b', where: { always: {} } }],
            fields: { custom: { type: 'keyword' } },
          }),
          testContentPackEntry({ name: 'root.b' }),
        ],
        include: { objects: { all: {} } },
      });

      const { merged } = mergeTrees({
        base: undefined,
        existing,
        incoming,
        resolverFactories: buildResolvers([]),
      });
      expect(merged.request.stream.ingest.wired.routing).toEqual([
        { destination: 'root.a', where: { always: {} } },
        { destination: 'root.b', where: { always: {} } },
      ]);
      expect(merged.request.stream.ingest.wired.fields).toEqual({
        existing: { type: 'keyword' },
        custom: { type: 'keyword' },
      });
    });
  });
});
