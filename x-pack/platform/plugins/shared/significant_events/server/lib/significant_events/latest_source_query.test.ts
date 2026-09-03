/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { executeAndDecodeSource, resolveTimeBound } from './latest_source_query';

describe('executeAndDecodeSource', () => {
  it('decodes a projected revision id alongside source without mutating source', async () => {
    const esql = jest.fn().mockResolvedValue({
      columns: [
        { name: '_source', type: 'source' },
        { name: '_revision_id', type: 'keyword' },
      ],
      values: [[{ id: 'query-1', kibana: { space_ids: ['default'] } }, 'document-id-1']],
    });
    const query = {
      print: jest.fn().mockReturnValue('FROM index | KEEP _source, _revision_id'),
    };

    await expect(
      executeAndDecodeSource(
        { esql: { query: esql } } as unknown as ElasticsearchClient,
        query as never,
        { revisionIdColumn: '_revision_id' }
      )
    ).resolves.toEqual({ hits: [{ id: 'query-1', _revision_id: 'document-id-1' }] });
  });
});

describe('resolveTimeBound', () => {
  it('resolves date-math expressions to ISO', () => {
    const iso = resolveTimeBound('now-7d');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('rounds date-math expressions up when requested', () => {
    const start = resolveTimeBound('now/d');
    const end = resolveTimeBound('now/d', { roundUp: true });
    expect(new Date(end).getTime()).toBeGreaterThan(new Date(start).getTime());
  });

  it('passes full ISO timestamps through verbatim', () => {
    expect(resolveTimeBound('2026-07-23T10:00:00.000Z')).toBe('2026-07-23T10:00:00.000Z');
  });

  it('passes date-only strings through verbatim so Elasticsearch parses them as UTC', () => {
    expect(resolveTimeBound('2026-07-23')).toBe('2026-07-23');
    expect(resolveTimeBound('2026-07-23', { roundUp: true })).toBe('2026-07-23');
  });

  it('resolves anchored date-math (||) expressions to a rounded-up day end', () => {
    const start = resolveTimeBound('2026-07-23||/d');
    const end = resolveTimeBound('2026-07-23||/d', { roundUp: true });
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });
});
