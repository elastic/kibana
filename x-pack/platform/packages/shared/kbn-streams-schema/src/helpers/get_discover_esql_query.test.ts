/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '../models/streams';
import { getDiscoverEsqlQuery } from './get_discover_esql_query';

const wiredStreamDefinition: Streams.WiredStream.Definition = {
  name: 'logs.otel',
  description: 'Test wired stream',
  updated_at: '2025-01-01T00:00:00.000Z',
  ingest: {
    lifecycle: { dsl: {} },
    processing: { steps: [], updated_at: '2025-01-01T00:00:00.000Z' },
    settings: {},
    wired: { fields: {}, routing: [] },
    failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
  },
};

const queryStreamDefinition: Streams.QueryStream.Definition = {
  name: 'logs.otel.nginx.errors',
  description: 'Test query stream',
  updated_at: '2025-01-01T00:00:00.000Z',
  query: {
    esql: 'FROM logs.otel.nginx | WHERE log.level == "error"',
    view: '$.logs.otel.nginx.errors',
  },
};

const classicStreamDefinition: Streams.ClassicStream.Definition = {
  name: 'logs-myapp',
  description: 'Test classic stream',
  updated_at: '2025-01-01T00:00:00.000Z',
  ingest: {
    lifecycle: { dsl: {} },
    processing: { steps: [], updated_at: '2025-01-01T00:00:00.000Z' },
    settings: {},
    failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
    classic: {},
  },
};

describe('getDiscoverEsqlQuery', () => {
  describe('wired streams', () => {
    it('returns FROM with the ES|QL view name and sort', () => {
      expect(getDiscoverEsqlQuery({ definition: wiredStreamDefinition })).toBe(
        'FROM $.logs.otel | SORT @timestamp DESC'
      );
    });

    it('appends METADATA _source when includeMetadata is true', () => {
      expect(
        getDiscoverEsqlQuery({ definition: wiredStreamDefinition, includeMetadata: true })
      ).toBe('FROM $.logs.otel METADATA _source | SORT @timestamp DESC');
    });

    it('does not append METADATA _source when includeMetadata is false', () => {
      expect(
        getDiscoverEsqlQuery({ definition: wiredStreamDefinition, includeMetadata: false })
      ).toBe('FROM $.logs.otel | SORT @timestamp DESC');
    });

    it('falls back to index patterns when useViews is false', () => {
      expect(getDiscoverEsqlQuery({ definition: wiredStreamDefinition, useViews: false })).toBe(
        'FROM logs.otel, logs.otel.* | SORT @timestamp DESC'
      );
    });

    it('falls back to index patterns with metadata when useViews is false', () => {
      expect(
        getDiscoverEsqlQuery({
          definition: wiredStreamDefinition,
          useViews: false,
          includeMetadata: true,
        })
      ).toBe('FROM logs.otel, logs.otel.* METADATA _source | SORT @timestamp DESC');
    });
  });

  describe('query streams', () => {
    it('returns FROM with the query view reference and sort', () => {
      expect(getDiscoverEsqlQuery({ definition: queryStreamDefinition })).toBe(
        'FROM $.logs.otel.nginx.errors | SORT @timestamp DESC'
      );
    });

    it('uses the query view regardless of useViews flag', () => {
      expect(getDiscoverEsqlQuery({ definition: queryStreamDefinition, useViews: false })).toBe(
        'FROM $.logs.otel.nginx.errors | SORT @timestamp DESC'
      );
    });
  });

  describe('classic streams', () => {
    it('returns FROM with the stream name and sort', () => {
      expect(getDiscoverEsqlQuery({ definition: classicStreamDefinition })).toBe(
        'FROM logs-myapp | SORT @timestamp DESC'
      );
    });

    it('appends METADATA _source when includeMetadata is true', () => {
      expect(
        getDiscoverEsqlQuery({
          definition: classicStreamDefinition,
          includeMetadata: true,
        })
      ).toBe('FROM logs-myapp METADATA _source | SORT @timestamp DESC');
    });
  });
});
