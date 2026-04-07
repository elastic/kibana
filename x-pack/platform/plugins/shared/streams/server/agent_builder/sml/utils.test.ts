/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { getStreamType } from './utils';

describe('getStreamType', () => {
  it('returns "wired" for a wired stream', () => {
    const definition = {
      name: 'logs.nginx',
      type: 'wired',
      description: '',
      updated_at: '',
      ingest: { wired: { fields: {} }, processing: [], routing: [] },
    } as unknown as Streams.all.Definition;
    expect(getStreamType(definition)).toBe('wired');
  });

  it('returns "classic" for a classic stream', () => {
    const definition = {
      name: 'logs.legacy',
      type: 'classic',
      description: '',
      updated_at: '',
      ingest: { classic: {} },
    } as unknown as Streams.all.Definition;
    expect(getStreamType(definition)).toBe('classic');
  });

  it('returns "query" for a query stream', () => {
    const definition = {
      name: 'logs.nginx.errors',
      type: 'query',
      description: '',
      updated_at: '',
      query: { esql: 'FROM logs.nginx' },
    } as unknown as Streams.all.Definition;
    expect(getStreamType(definition)).toBe('query');
  });

  it('returns "unknown" for an unrecognized stream type', () => {
    const definition = {
      name: 'mystery',
      type: 'other',
      description: '',
      updated_at: '',
    } as unknown as Streams.all.Definition;
    expect(getStreamType(definition)).toBe('unknown');
  });
});
