/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { getDefaultQueryFrom, getValidPrefixes } from './get_valid_prefixes';

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

describe('getDefaultQueryFrom', () => {
  it('returns FROM <name> for classic streams', () => {
    const result = getDefaultQueryFrom(makeClassicDefinition('logs'));
    expect(result).toBe('FROM logs METADATA _id, _source');
  });

  it('returns FROM <name>,<name>.* for wired streams', () => {
    const result = getDefaultQueryFrom(makeWiredDefinition('logs'));
    expect(result).toBe('FROM logs,logs.* METADATA _id, _source');
  });
});

describe('getValidPrefixes', () => {
  describe('wired stream definitions', () => {
    it('returns only the primary prefix', () => {
      const definition = makeWiredDefinition('logs');
      const result = getValidPrefixes(definition);
      expect(result.primary).toBe('FROM logs,logs.* METADATA _id, _source');
      expect(result.all).toEqual(['FROM logs,logs.* METADATA _id, _source']);
    });

    it('returns only the primary prefix even when initialEsql uses wired-style pattern', () => {
      const definition = makeWiredDefinition('logs');
      const result = getValidPrefixes(
        definition,
        'FROM logs,logs.* METADATA _id, _source | WHERE severity = "critical"'
      );
      expect(result.primary).toBe('FROM logs,logs.* METADATA _id, _source');
      expect(result.all).toEqual(['FROM logs,logs.* METADATA _id, _source']);
    });
  });

  describe('classic stream definitions', () => {
    it('returns only the primary prefix when no initialEsql is provided', () => {
      const definition = makeClassicDefinition('logs');
      const result = getValidPrefixes(definition);
      expect(result.primary).toBe('FROM logs METADATA _id, _source');
      expect(result.all).toEqual(['FROM logs METADATA _id, _source']);
    });

    it('returns only the primary prefix when initialEsql uses the primary pattern', () => {
      const definition = makeClassicDefinition('logs');
      const result = getValidPrefixes(
        definition,
        'FROM logs METADATA _id, _source | WHERE severity = "critical"'
      );
      expect(result.primary).toBe('FROM logs METADATA _id, _source');
      expect(result.all).toEqual(['FROM logs METADATA _id, _source']);
    });

    it('returns both primary and wired-style prefixes when initialEsql uses the wired-style pattern', () => {
      const definition = makeClassicDefinition('logs');
      const result = getValidPrefixes(
        definition,
        'FROM logs,logs.* METADATA _id, _source | WHERE severity = "critical"'
      );
      expect(result.primary).toBe('FROM logs METADATA _id, _source');
      expect(result.all).toEqual([
        'FROM logs METADATA _id, _source',
        'FROM logs,logs.* METADATA _id, _source',
      ]);
    });
  });
});
