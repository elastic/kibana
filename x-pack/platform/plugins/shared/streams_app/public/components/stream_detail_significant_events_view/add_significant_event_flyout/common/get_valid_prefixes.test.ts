/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { getValidPrefixes } from './get_valid_prefixes';

const makeClassicDefinition = (name: string): Streams.ClassicStream.Definition => ({
  name,
  description: '',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    classic: {},
    failure_store: { inherit: {} },
  },
});

const makeWiredDefinition = (name: string): Streams.WiredStream.Definition => ({
  name,
  description: '',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    wired: { fields: {}, routing: [] },
    failure_store: { inherit: {} },
  },
});

describe('getValidPrefixes', () => {
  describe('wired stream definitions', () => {
    it('returns only the primary prefix', () => {
      const definition = makeWiredDefinition('logs');
      const result = getValidPrefixes(definition);
      expect(result.primary).toBe('FROM logs,logs.* METADATA _id, _source');
      expect(result.alsoAllowed).toBeUndefined();
    });

    it('returns only the primary prefix even when initialEsql uses wired-style pattern', () => {
      const definition = makeWiredDefinition('logs');
      const result = getValidPrefixes(
        definition,
        'FROM logs,logs.* METADATA _id, _source | WHERE severity = "critical"'
      );
      expect(result.primary).toBe('FROM logs,logs.* METADATA _id, _source');
      expect(result.alsoAllowed).toBeUndefined();
    });
  });

  describe('classic stream definitions', () => {
    it('returns only the primary prefix when no initialEsql is provided', () => {
      const definition = makeClassicDefinition('logs');
      const result = getValidPrefixes(definition);
      expect(result.primary).toBe('FROM logs METADATA _id, _source');
      expect(result.alsoAllowed).toBeUndefined();
    });

    it('returns only the primary prefix when initialEsql uses the primary pattern', () => {
      const definition = makeClassicDefinition('logs');
      const result = getValidPrefixes(
        definition,
        'FROM logs METADATA _id, _source | WHERE severity = "critical"'
      );
      expect(result.primary).toBe('FROM logs METADATA _id, _source');
      expect(result.alsoAllowed).toBeUndefined();
    });

    it('includes wired-style as alternative when initialEsql uses the wired-style pattern', () => {
      const definition = makeClassicDefinition('logs');
      const result = getValidPrefixes(
        definition,
        'FROM logs,logs.* METADATA _id, _source | WHERE severity = "critical"'
      );
      expect(result.primary).toBe('FROM logs METADATA _id, _source');
      expect(result.alsoAllowed).toEqual(['FROM logs,logs.* METADATA _id, _source']);
    });
  });
});
