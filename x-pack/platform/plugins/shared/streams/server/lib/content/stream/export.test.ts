/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import { prepareStreamsForExport } from './export';
import { asTree } from './tree';
import { test_contentPackEntry } from './test.utils';

const streams = [
  test_contentPackEntry({
    name: 'logs',
    routing: [
      { destination: 'logs.foo', if: { always: {} } },
      { destination: 'logs.hello', if: { always: {} } },
    ],
    queries: [{ id: 'logs-query', title: 'logs-query', kql: { query: 'logs' } }],
  }),
  test_contentPackEntry({
    name: 'logs.foo',
    routing: [{ destination: 'logs.foo.bar', if: { always: {} } }],
  }),
  test_contentPackEntry({ name: 'logs.foo.bar' }),
  test_contentPackEntry({
    name: 'logs.hello',
    queries: [{ id: 'hello-query', title: 'hello-query', kql: { query: 'hello' } }],
  }),
];

describe('content pack export', () => {
  it('renames exported streams', () => {
    const tree = asTree({
      include: { objects: { all: {} } },
      root: 'logs',
      streams,
    });

    const exportedStreams = prepareStreamsForExport({
      tree,
      inheritedFields: { inherited_field_1: { type: 'keyword' } },
    });
    expect(sortBy(exportedStreams, 'name')).toEqual([
      test_contentPackEntry({
        name: ROOT_STREAM_ID,
        fields: { inherited_field_1: { type: 'keyword' } },
        routing: [
          { destination: 'foo', if: { always: {} } },
          { destination: 'hello', if: { always: {} } },
        ],
        queries: [{ id: 'logs-query', title: 'logs-query', kql: { query: 'logs' } }],
      }),
      test_contentPackEntry({
        name: 'foo',
        routing: [{ destination: 'foo.bar', if: { always: {} } }],
      }),
      test_contentPackEntry({ name: 'foo.bar' }),
      test_contentPackEntry({
        name: 'hello',
        queries: [{ id: 'hello-query', title: 'hello-query', kql: { query: 'hello' } }],
      }),
    ]);
  });

  it('exports selected objects', () => {
    const tree = asTree({
      include: {
        objects: {
          queries: [],
          routing: [
            {
              destination: 'logs.hello',
              objects: {
                routing: [],
                queries: [{ id: 'hello-query' }],
              },
            },
          ],
        },
      },
      root: 'logs',
      streams,
    });

    const exportedStreams = prepareStreamsForExport({ tree, inheritedFields: {} });
    expect(sortBy(exportedStreams, 'name')).toEqual([
      test_contentPackEntry({
        name: ROOT_STREAM_ID,
        routing: [{ destination: 'hello', if: { always: {} } }],
      }),
      test_contentPackEntry({
        name: 'hello',
        queries: [{ id: 'hello-query', title: 'hello-query', kql: { query: 'hello' } }],
      }),
    ]);
  });
});
