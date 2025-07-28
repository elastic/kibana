/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, RoutingDefinition, StreamQuery } from '@kbn/streams-schema';
import { asTree, mergeTrees } from './tree';

const contentPackEntry = ({
  name,
  fields = {},
  routing = [],
  queries = [],
}: {
  name: string;
  fields?: FieldDefinition;
  routing?: RoutingDefinition[];
  queries?: StreamQuery[];
}) => ({
  type: 'stream' as const,
  name,
  request: {
    queries,
    dashboards: [],
    stream: {
      description: '',
      ingest: {
        processing: [],
        lifecycle: { inherit: {} },
        wired: { routing, fields },
      },
    },
  },
});

describe('content pack stream helpers', () => {
  describe('asTree', () => {
    it('builds a complete tree when includeAll is provided', () => {
      const root = contentPackEntry({
        name: 'root',
        routing: [
          { destination: 'root.child1', if: { always: {} } },
          { destination: 'root.child2', if: { always: {} } },
        ],
      });
      const child1 = contentPackEntry({
        name: 'root.child1',
        routing: [{ destination: 'root.child1.nested', if: { always: {} } }],
      });
      const child2 = contentPackEntry({ name: 'root.child2' });
      const child1Nested = contentPackEntry({ name: 'root.child1.nested' });

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
      const root = contentPackEntry({
        name: 'root',
        routing: [
          { destination: 'root.child1', if: { always: {} } },
          { destination: 'root.child2', if: { always: {} } },
        ],
      });
      const child1 = contentPackEntry({
        name: 'root.child1',
        routing: [{ destination: 'root.child1.nested', if: { always: {} } }],
      });
      const child2 = contentPackEntry({ name: 'root.child2' });
      const child1Nested = contentPackEntry({
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
        { destination: 'root.child1', if: { always: {} } },
      ]);
      expect(tree.children[0].name).toEqual('root.child1');
      expect(tree.children[0].request.stream.ingest.wired.routing).toEqual([
        { destination: 'root.child1.nested', if: { always: {} } },
      ]);
      expect(tree.children[0].children).toHaveLength(1);
      expect(tree.children[0].children[0].name).toEqual('root.child1.nested');
      expect(tree.children[0].children[0].request.queries).toEqual([
        { id: 'keep', title: 'keep query', kql: { query: 'keep' } },
      ]);
    });

    it('filters streams and queries according to include spec', () => {
      const root = contentPackEntry({
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
      const root = contentPackEntry({
        name: 'root',
        routing: [{ destination: 'root.child1', if: { always: {} } }],
      });
      const child1 = contentPackEntry({ name: 'root.child1' });

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
          contentPackEntry({
            name: 'root',
            routing: [{ destination: 'root.a', if: { always: {} } }],
            fields: { existing: { type: 'keyword' } },
          }),
          contentPackEntry({ name: 'root.a' }),
        ],
        include: { objects: { all: {} } },
      });

      const incoming = asTree({
        root: 'root',
        streams: [
          contentPackEntry({
            name: 'root',
            routing: [{ destination: 'root.b', if: { always: {} } }],
            fields: { custom: { type: 'keyword' } },
          }),
          contentPackEntry({ name: 'root.b' }),
        ],
        include: { objects: { all: {} } },
      });

      const merged = mergeTrees({ existing, incoming });
      expect(merged.request.stream.ingest.wired.routing).toEqual([
        { destination: 'root.a', if: { always: {} } },
        { destination: 'root.b', if: { always: {} } },
      ]);
      expect(merged.request.stream.ingest.wired.fields).toEqual({
        existing: { type: 'keyword' },
        custom: { type: 'keyword' },
      });
    });

    it('throws on duplicate child destination', () => {
      const existing = asTree({
        root: 'root',
        streams: [
          contentPackEntry({
            name: 'root',
            routing: [{ destination: 'root.a', if: { always: {} } }],
          }),
          contentPackEntry({ name: 'root.a' }),
        ],
        include: { objects: { all: {} } },
      });
      const incoming = asTree({
        root: 'root',
        streams: [
          contentPackEntry({
            name: 'root',
            routing: [{ destination: 'root.a', if: { always: {} } }],
          }),
          contentPackEntry({ name: 'root.a' }),
        ],
        include: { objects: { all: {} } },
      });

      expect(() => mergeTrees({ existing, incoming })).toThrow(
        'Child stream [root.a] already exists'
      );
    });

    it('throws on conflicting field mapping', () => {
      const existing = asTree({
        root: 'root',
        streams: [contentPackEntry({ name: 'root', fields: { custom: { type: 'keyword' } } })],
        include: { objects: { all: {} } },
      });
      const incoming = asTree({
        root: 'root',
        streams: [contentPackEntry({ name: 'root', fields: { custom: { type: 'long' } } })],
        include: { objects: { all: {} } },
      });

      expect(() => mergeTrees({ existing, incoming })).toThrow('Cannot change mapping of [custom]');
    });
  });
});
