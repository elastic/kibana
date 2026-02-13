/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDiscoverEsqlQuery } from './get_discover_esql_query';
import type { Streams } from '../models/streams';
import { getEsqlViewName } from '../models/query/view_name';

describe('getDiscoverEsqlQuery', () => {
  describe('wired streams', () => {
    const createWiredStreamDefinition = (
      name: string,
      draft?: boolean
    ): Streams.WiredStream.Definition => ({
      name,
      description: '',
      updated_at: new Date().toISOString(),
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: new Date().toISOString() },
        settings: {},
        wired: {
          fields: {},
          routing: [],
          ...(draft !== undefined ? { draft } : {}),
        },
        failure_store: { inherit: {} },
      },
    });

    it('returns index patterns for non-draft wired streams', () => {
      const definition = createWiredStreamDefinition('logs');
      const result = getDiscoverEsqlQuery({ definition });
      expect(result).toBe('FROM logs, logs.*');
    });

    it('returns ESQL view query for draft wired streams', () => {
      const definition = createWiredStreamDefinition('logs.draft', true);
      const result = getDiscoverEsqlQuery({ definition });
      expect(result).toBe(`FROM ${getEsqlViewName('logs.draft')}`);
    });

    it('returns index patterns when draft is explicitly false', () => {
      const definition = createWiredStreamDefinition('logs.child', false);
      const result = getDiscoverEsqlQuery({ definition });
      expect(result).toBe('FROM logs.child, logs.child.*');
    });

    it('uses TS command for time_series index mode', () => {
      const definition = createWiredStreamDefinition('metrics');
      const result = getDiscoverEsqlQuery({ definition, indexMode: 'time_series' });
      expect(result).toBe('TS metrics, metrics.*');
    });

    it('includes METADATA _source when includeMetadata is true', () => {
      const definition = createWiredStreamDefinition('logs');
      const result = getDiscoverEsqlQuery({ definition, includeMetadata: true });
      expect(result).toBe('FROM logs, logs.* METADATA _source');
    });
  });

  describe('query streams', () => {
    const createQueryStreamDefinition = (name: string): Streams.QueryStream.Definition => ({
      name,
      description: '',
      updated_at: new Date().toISOString(),
      query: {
        esql: 'FROM logs | WHERE level == "error"',
        view: '$.logs.errors',
      },
    });

    it('returns the view name for query streams', () => {
      const definition = createQueryStreamDefinition('logs.errors');
      const result = getDiscoverEsqlQuery({ definition });
      expect(result).toBe('FROM $.logs.errors');
    });
  });

  describe('classic streams', () => {
    const createClassicStreamDefinition = (name: string): Streams.ClassicStream.Definition => ({
      name,
      description: '',
      updated_at: new Date().toISOString(),
      ingest: {
        lifecycle: { dsl: {} },
        processing: { steps: [], updated_at: new Date().toISOString() },
        settings: {},
        classic: {},
        failure_store: { disabled: {} },
      },
    });

    it('returns stream name for classic streams', () => {
      const definition = createClassicStreamDefinition('my-logs');
      const result = getDiscoverEsqlQuery({ definition });
      // Classic streams use the stream name
      expect(result).toBe('FROM my-logs');
    });
  });
});
