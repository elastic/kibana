/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { diffTrees } from './diff';
import { testContentPackEntry } from './test.utils';
import { asTree } from './tree';

describe('content stream diff', () => {
  it('returns a proper diff when deleted', () => {
    const existing = asTree({
      root: 'logs.foo',
      streams: [
        testContentPackEntry({
          name: 'logs.foo',
          routing: [{ destination: 'logs.foo.bar', if: { always: {} } }],
        }),
        testContentPackEntry({
          name: 'logs.foo.bar',
          routing: [{ destination: 'logs.foo.bar.baz', if: { always: {} } }],
        }),
        testContentPackEntry({ name: 'logs.foo.bar.baz' }),
      ],
      include: { objects: { all: {} } },
    });

    const merged = asTree({
      root: 'logs.foo',
      streams: [
        testContentPackEntry({
          name: 'logs.foo',
          routing: [],
        }),
      ],
      include: { objects: { all: {} } },
    });

    const changes = diffTrees({ existing, merged });
    expect(changes).toEqual([
      {
        name: 'logs.foo',
        changes: [
          {
            operation: 'remove',
            type: 'routing',
            value: { destination: 'logs.foo.bar', if: { always: {} } },
          },
        ],
      },
      { name: 'logs.foo.bar', changes: [] },
      { name: 'logs.foo.bar.baz', changes: [] },
    ]);
  });

  it('returns a proper diff when added', () => {
    const existing = asTree({
      root: 'logs.foo',
      streams: [
        testContentPackEntry({
          name: 'logs.foo',
          routing: [],
        }),
      ],
      include: { objects: { all: {} } },
    });

    const merged = asTree({
      root: 'logs.foo',
      streams: [
        testContentPackEntry({
          name: 'logs.foo',
          routing: [{ destination: 'logs.foo.bar', if: { always: {} } }],
        }),
        testContentPackEntry({
          name: 'logs.foo.bar',
          routing: [{ destination: 'logs.foo.bar.baz', if: { always: {} } }],
        }),
        testContentPackEntry({ name: 'logs.foo.bar.baz' }),
      ],
      include: { objects: { all: {} } },
    });

    const changes = diffTrees({ existing, merged });
    expect(changes).toEqual([
      {
        name: 'logs.foo',
        changes: [
          {
            operation: 'add',
            type: 'routing',
            value: { destination: 'logs.foo.bar', if: { always: {} } },
          },
        ],
      },
      { name: 'logs.foo.bar', changes: [] },
      { name: 'logs.foo.bar.baz', changes: [] },
    ]);
  });

  it('returns a proper diff when updated', () => {
    const existing = asTree({
      root: 'logs.foo',
      streams: [
        testContentPackEntry({
          name: 'logs.foo',
          routing: [{ destination: 'logs.foo.bar', if: { always: {} } }],
        }),
        testContentPackEntry({
          name: 'logs.foo.bar',
          fields: { 'foo.bar': { type: 'keyword' } },
          routing: [{ destination: 'logs.foo.bar.baz', if: { always: {} } }],
        }),
        testContentPackEntry({ name: 'logs.foo.bar.baz' }),
      ],
      include: { objects: { all: {} } },
    });

    const merged = asTree({
      root: 'logs.foo',
      streams: [
        testContentPackEntry({
          name: 'logs.foo',
          routing: [{ destination: 'logs.foo.bar', if: { always: {} } }],
        }),
        testContentPackEntry({
          name: 'logs.foo.bar',
          fields: { 'foo.bar': { type: 'long' } },
          routing: [{ destination: 'logs.foo.bar.baz', if: { never: {} } }],
        }),
        testContentPackEntry({ name: 'logs.foo.bar.baz' }),
      ],
      include: { objects: { all: {} } },
    });

    const changes = diffTrees({ existing, merged });
    expect(changes).toEqual([
      {
        name: 'logs.foo',
        changes: [],
      },
      {
        name: 'logs.foo.bar',
        changes: [
          {
            type: 'field',
            operation: 'update',
            value: {
              from: { 'foo.bar': { type: 'keyword' } },
              to: { 'foo.bar': { type: 'long' } },
            },
          },
          {
            type: 'routing',
            operation: 'update',
            value: {
              from: { destination: 'logs.foo.bar.baz', if: { always: {} } },
              to: { destination: 'logs.foo.bar.baz', if: { never: {} } },
            },
          },
        ],
      },
      { name: 'logs.foo.bar.baz', changes: [] },
    ]);
  });

  it('returns a proper diff when nothing changed', () => {
    const existing = asTree({
      root: 'logs.foo',
      streams: [
        testContentPackEntry({
          name: 'logs.foo',
          routing: [{ destination: 'logs.foo.bar', if: { always: {} } }],
        }),
        testContentPackEntry({
          name: 'logs.foo.bar',
          routing: [{ destination: 'logs.foo.bar.baz', if: { always: {} } }],
        }),
        testContentPackEntry({ name: 'logs.foo.bar.baz' }),
      ],
      include: { objects: { all: {} } },
    });

    const merged = asTree({
      root: 'logs.foo',
      streams: [
        testContentPackEntry({
          name: 'logs.foo',
          routing: [{ destination: 'logs.foo.bar', if: { always: {} } }],
        }),
        testContentPackEntry({
          name: 'logs.foo.bar',
          routing: [{ destination: 'logs.foo.bar.baz', if: { always: {} } }],
        }),
        testContentPackEntry({ name: 'logs.foo.bar.baz' }),
      ],
      include: { objects: { all: {} } },
    });

    const changes = diffTrees({ existing, merged });
    expect(changes).toEqual([
      { name: 'logs.foo', changes: [] },
      { name: 'logs.foo.bar', changes: [] },
      { name: 'logs.foo.bar.baz', changes: [] },
    ]);
  });
});
