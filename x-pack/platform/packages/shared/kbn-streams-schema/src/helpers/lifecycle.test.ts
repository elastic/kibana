/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '../models/streams';
import type { IngestStreamLifecycle } from '../models/ingest/lifecycle';
import { findInheritedLifecycle, findInheritingStreams } from './lifecycle';

function createMockWiredStream(
  name: string,
  lifecycle: IngestStreamLifecycle
): Streams.WiredStream.Definition {
  return {
    name,
    description: name,
    updated_at: new Date().toISOString(),
    ingest: {
      lifecycle,
      wired: { fields: {}, routing: [] },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      failure_store: { inherit: {} },
    },
  };
}

describe('Lifecycle helpers', () => {
  describe('findInheritedLifecycle', () => {
    it('picks the definition lifecycle', () => {
      const definition = createMockWiredStream('one.two', { dsl: { data_retention: '1d' } });

      const ancestors = [createMockWiredStream('one', { ilm: { policy: 'policy' } })];

      const lifecycle = findInheritedLifecycle(definition, ancestors);

      expect(lifecycle).toEqual({
        from: 'one.two',
        dsl: { data_retention: '1d' },
      });
    });

    it('picks the nearest parent lifecycle', () => {
      createMockWiredStream('one.two.three.four', { inherit: {} });

      const definition = createMockWiredStream('one.two.three.four', { inherit: {} });
      const ancestors = [
        createMockWiredStream('one', { ilm: { policy: 'one ' } }),
        createMockWiredStream('one.two.three', { inherit: {} }),
        createMockWiredStream('one.two', { dsl: { data_retention: '1d' } }),
      ] satisfies Streams.WiredStream.Definition[];

      const lifecycle = findInheritedLifecycle(definition, ancestors);

      expect(lifecycle).toEqual({
        from: 'one.two',
        dsl: { data_retention: '1d' },
      });
    });
  });

  describe('findInheritingStreams', () => {
    it('returns all streams', () => {
      const definition = createMockWiredStream('one', { dsl: { data_retention: '1d' } });
      const descendants = [
        createMockWiredStream('one.two.three', { inherit: {} }),
        createMockWiredStream('one.two2', { inherit: {} }),
        createMockWiredStream('one.two', { inherit: {} }),
        createMockWiredStream('one.two2.three', { inherit: {} }),
        createMockWiredStream('one.two2.three.four', { inherit: {} }),
      ];

      const inheritingStreams = findInheritingStreams(definition, descendants);

      expect(inheritingStreams).toEqual(
        expect.arrayContaining([
          'one',
          'one.two.three',
          'one.two2',
          'one.two',
          'one.two2.three',
          'one.two2.three.four',
        ])
      );
    });

    it('ignores subtrees with overrides', () => {
      const definition = createMockWiredStream('one', { dsl: { data_retention: '1d' } });
      const descendants = [
        createMockWiredStream('one.override', { ilm: { policy: 'policy' } }),
        createMockWiredStream('one.override.deeply', { inherit: {} }),
        createMockWiredStream('one.override.deeply.nested', { inherit: {} }),
        createMockWiredStream('one.inheriting', { inherit: {} }),
        createMockWiredStream('one.inheriting.deeply', { inherit: {} }),
        createMockWiredStream('one.inheriting.deeply.nested', { inherit: {} }),
        createMockWiredStream('one.override2', { dsl: { data_retention: '10d' } }),
      ];

      const inheritingStreams = findInheritingStreams(definition, descendants);

      expect(inheritingStreams).toEqual(
        expect.arrayContaining([
          'one',
          'one.inheriting',
          'one.inheriting.deeply',
          'one.inheriting.deeply.nested',
        ])
      );
    });

    it('handles leaf node', () => {
      const definition = createMockWiredStream('one', { dsl: { data_retention: '1d' } });
      const descendants = [] as Streams.WiredStream.Definition[];

      const inheritingStreams = findInheritingStreams(definition, descendants);

      expect(inheritingStreams).toEqual(['one']);
    });
  });
});
