/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { prepareStreamsForImport } from './import';
import { asTree } from './tree';
import { testContentPackEntry } from './test.utils';

describe('content pack import', () => {
  it('merges imported streams in a target stream', () => {
    const existing = asTree({
      root: 'logs',
      streams: [
        testContentPackEntry({
          name: 'logs',
          routing: [{ destination: 'logs.foo', where: { always: {} }, status: 'enabled' }],
        }),
        testContentPackEntry({ name: 'logs.foo' }),
      ],
      include: { objects: { all: {} } },
    });

    const incoming = asTree({
      root: 'logs',
      streams: [
        testContentPackEntry({
          name: 'logs',
          routing: [{ destination: 'logs.bar', where: { always: {} }, status: 'enabled' }],
        }),
        testContentPackEntry({
          name: 'logs.bar',
          routing: [{ destination: 'logs.bar.baz', where: { always: {} }, status: 'enabled' }],
        }),
        testContentPackEntry({ name: 'logs.bar.baz' }),
      ],
      include: { objects: { all: {} } },
    });

    const importedStreams = prepareStreamsForImport({ existing, incoming });

    expect(sortBy(importedStreams, 'name')).toEqual([
      testContentPackEntry({
        name: 'logs',
        routing: [
          { destination: 'logs.foo', where: { always: {} }, status: 'enabled' },
          { destination: 'logs.bar', where: { always: {} }, status: 'enabled' },
        ],
      }),
      testContentPackEntry({
        name: 'logs.bar',
        routing: [{ destination: 'logs.bar.baz', where: { always: {} }, status: 'enabled' }],
      }),
      testContentPackEntry({ name: 'logs.bar.baz' }),
      testContentPackEntry({ name: 'logs.foo' }),
    ]);
  });
});
