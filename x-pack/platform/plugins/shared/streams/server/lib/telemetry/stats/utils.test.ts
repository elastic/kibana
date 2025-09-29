/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import {
  hasChangedRetention,
  percentiles,
  isClassicStream,
  isWiredStream,
  isGroupStream,
} from './utils';

describe('telemetry utils', () => {
  describe('hasChangedRetention', () => {
    it('returns false for undefined lifecycle', () => {
      expect(hasChangedRetention(undefined)).toBe(false);
    });

    it('returns false for inherit lifecycle (default retention)', () => {
      expect(hasChangedRetention({ inherit: {} })).toBe(false);
    });

    it('returns true for DSL lifecycle with custom retention', () => {
      expect(hasChangedRetention({ dsl: { data_retention: '30d' } })).toBe(true);
    });

    it('returns true for DSL lifecycle with forever retention (empty DSL)', () => {
      expect(hasChangedRetention({ dsl: {} })).toBe(true);
    });
  });

  describe('percentiles', () => {
    it('calculates percentiles correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = percentiles(data, [50, 95]);
      expect(result[0]).toBeCloseTo(5.5); // 50th percentile
      expect(result[1]).toBeCloseTo(9.55); // 95th percentile
    });

    it('handles empty array', () => {
      const result = percentiles([], [50, 95]);
      expect(result).toEqual([0, 0]);
    });

    it('handles single value', () => {
      const result = percentiles([5], [50, 95]);
      expect(result).toEqual([5, 5]);
    });
  });

  describe('lightweight stream type detection', () => {
    // Test data representing different stream types
    const classicStreamDef = {
      name: 'test-classic',
      description: '',
      ingest: {
        classic: { field_overrides: {} },
        lifecycle: { inherit: {} },
        processing: { steps: [] },
        settings: {},
      },
    };

    const wiredStreamDef = {
      name: 'test-wired',
      description: '',
      ingest: {
        wired: { fields: {}, routing: [] },
        lifecycle: { inherit: {} },
        processing: { steps: [] },
        settings: {},
      },
    };

    const groupStreamDef = {
      name: 'test-group',
      description: '',
      group: {
        metadata: {},
        tags: [],
        members: [],
      },
    };

    describe('compatibility with official schema type guards', () => {
      it('isClassicStream matches Streams.ClassicStream.Definition.is()', () => {
        // Test classic stream
        expect(isClassicStream(classicStreamDef)).toBe(
          Streams.ClassicStream.Definition.is(classicStreamDef)
        );

        // Test non-classic streams
        expect(isClassicStream(wiredStreamDef)).toBe(
          Streams.ClassicStream.Definition.is(wiredStreamDef)
        );
        expect(isClassicStream(groupStreamDef)).toBe(
          Streams.ClassicStream.Definition.is(groupStreamDef)
        );

        // Test invalid/empty objects
        expect(isClassicStream({} as any)).toBe(Streams.ClassicStream.Definition.is({} as any));
        expect(isClassicStream(null)).toBe(false); // Our function handles null safely
        expect(isClassicStream(undefined)).toBe(false); // Our function handles undefined safely
      });

      it('isWiredStream matches Streams.WiredStream.Definition.is()', () => {
        // Test wired stream
        expect(isWiredStream(wiredStreamDef)).toBe(
          Streams.WiredStream.Definition.is(wiredStreamDef)
        );

        // Test non-wired streams
        expect(isWiredStream(classicStreamDef)).toBe(
          Streams.WiredStream.Definition.is(classicStreamDef)
        );
        expect(isWiredStream(groupStreamDef)).toBe(
          Streams.WiredStream.Definition.is(groupStreamDef)
        );

        // Test invalid/empty objects
        expect(isWiredStream({} as any)).toBe(Streams.WiredStream.Definition.is({} as any));
        expect(isWiredStream(null)).toBe(false); // Our function handles null safely
        expect(isWiredStream(undefined)).toBe(false); // Our function handles undefined safely
      });

      it('isGroupStream matches Streams.GroupStream.Definition.is()', () => {
        // Test group stream
        expect(isGroupStream(groupStreamDef)).toBe(
          Streams.GroupStream.Definition.is(groupStreamDef)
        );

        // Test non-group streams
        expect(isGroupStream(classicStreamDef)).toBe(
          Streams.GroupStream.Definition.is(classicStreamDef)
        );
        expect(isGroupStream(wiredStreamDef)).toBe(
          Streams.GroupStream.Definition.is(wiredStreamDef)
        );

        // Test invalid/empty objects
        expect(isGroupStream({} as any)).toBe(Streams.GroupStream.Definition.is({} as any));
        expect(isGroupStream(null)).toBe(false); // Our function handles null safely
        expect(isGroupStream(undefined)).toBe(false); // Our function handles undefined safely
      });
    });
  });
});
