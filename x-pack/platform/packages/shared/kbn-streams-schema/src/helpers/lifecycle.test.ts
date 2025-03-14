/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WiredStreamDefinition } from '../models/ingest/base';
import { findInheritedLifecycle, findInheritingStreams } from './lifecycle';

describe('Lifecycle helpers', () => {
  describe('findInheritedLifecycle', () => {
    it('picks the definition lifecycle', () => {
      const definition = {
        name: 'one.two',
        ingest: { lifecycle: { dsl: { data_retention: '1d' } } },
      } as WiredStreamDefinition;
      const ancestors = [
        {
          name: 'one',
          ingest: { lifecycle: { ilm: { policy: 'policy' } } },
        },
      ] as WiredStreamDefinition[];

      const lifecycle = findInheritedLifecycle(definition, ancestors);

      expect(lifecycle).toEqual({
        from: 'one.two',
        dsl: { data_retention: '1d' },
      });
    });

    it('picks the nearest parent lifecycle', () => {
      const definition = {
        name: 'one.two.three.four',
        ingest: { lifecycle: { inherit: {} } },
      } as WiredStreamDefinition;
      const ancestors = [
        {
          name: 'one',
          ingest: { lifecycle: { ilm: { policy: 'one' } } },
        },
        {
          name: 'one.two.three',
          ingest: { lifecycle: { inherit: {} } },
        },
        {
          name: 'one.two',
          ingest: { lifecycle: { dsl: { data_retention: '1d' } } },
        },
      ] as WiredStreamDefinition[];

      const lifecycle = findInheritedLifecycle(definition, ancestors);

      expect(lifecycle).toEqual({
        from: 'one.two',
        dsl: { data_retention: '1d' },
      });
    });

    it('returns undefined if no lifecycle defined in the chain', () => {
      const definition = {
        name: 'one.two.three',
        ingest: { lifecycle: { inherit: {} } },
      } as WiredStreamDefinition;
      const ancestors = [
        { name: 'one.two', ingest: { lifecycle: { inherit: {} } } },
        { name: 'one', ingest: { lifecycle: { disabled: {} } } },
      ] as WiredStreamDefinition[];

      const lifecycle = findInheritedLifecycle(definition, ancestors);

      expect(lifecycle).toEqual({
        from: 'one',
        disabled: {},
      });
    });
  });

  describe('findInheritingStreams', () => {
    it('returns all streams', () => {
      const definition = {
        name: 'one',
        ingest: { lifecycle: { dsl: { data_retention: '1d' } } },
      } as WiredStreamDefinition;
      const descendants = [
        { name: 'one.two.three', ingest: { lifecycle: { inherit: {} } } },
        { name: 'one.two2', ingest: { lifecycle: { inherit: {} } } },
        { name: 'one.two', ingest: { lifecycle: { inherit: {} } } },
        { name: 'one.two2.three', ingest: { lifecycle: { inherit: {} } } },
        { name: 'one.two2.three.four', ingest: { lifecycle: { inherit: {} } } },
      ] as WiredStreamDefinition[];

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
      const definition = {
        name: 'one',
        ingest: { lifecycle: { dsl: { data_retention: '1d' } } },
      } as WiredStreamDefinition;
      const descendants = [
        {
          name: 'one.override',
          ingest: { lifecycle: { ilm: { policy: 'policy' } } },
        } as WiredStreamDefinition,
        { name: 'one.override.deeply', ingest: { lifecycle: { inherit: {} } } },
        { name: 'one.override.deeply.nested', ingest: { lifecycle: { inherit: {} } } },
        { name: 'one.inheriting', ingest: { lifecycle: { inherit: {} } } },
        { name: 'one.inheriting.deeply', ingest: { lifecycle: { inherit: {} } } },
        { name: 'one.inheriting.deeply.nested', ingest: { lifecycle: { inherit: {} } } },
        { name: 'one.override2', ingest: { lifecycle: { dsl: { data_retention: '10d' } } } },
      ] as WiredStreamDefinition[];

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
      const definition = {
        name: 'one',
        ingest: { lifecycle: { dsl: { data_retention: '1d' } } },
      } as WiredStreamDefinition;
      const descendants = [] as WiredStreamDefinition[];

      const inheritingStreams = findInheritingStreams(definition, descendants);

      expect(inheritingStreams).toEqual(['one']);
    });
  });
});
