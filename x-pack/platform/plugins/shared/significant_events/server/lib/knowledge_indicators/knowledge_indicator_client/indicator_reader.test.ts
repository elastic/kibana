/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../significant_events/latest_source_query', () => {
  const actual = jest.requireActual('../../significant_events/latest_source_query');
  return {
    ...actual,
    executeAndDecodeSource: jest.fn(),
  };
});

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { executeAndDecodeSource } from '../../significant_events/latest_source_query';
import { RevisionReader } from './revision_reader';
import { IndicatorReader } from './indicator_reader';
import type { StoredQueryKnowledgeIndicator } from '../data_stream';
import { KI_TYPE_QUERY } from '../fields';

const IS_NOT_EXPIRED_FRAGMENT = 'expires_at IS NULL OR expires_at >= NOW()';
const STREAM = 'logs-app';

function makeReader(space = 'default'): {
  reader: IndicatorReader;
  runEsql: jest.Mock;
} {
  const runEsql = executeAndDecodeSource as jest.Mock;
  const logger = loggerMock.create();
  const revisionReader = new RevisionReader({} as ElasticsearchClient, logger, space);
  const reader = new IndicatorReader(revisionReader);
  return { reader, runEsql };
}

function createQueryDoc(
  overrides: Partial<StoredQueryKnowledgeIndicator> = {}
): StoredQueryKnowledgeIndicator {
  return {
    '@timestamp': '2026-01-01T00:00:00.000Z',
    id: 'query-1',
    type: KI_TYPE_QUERY,
    'stream.name': STREAM,
    title: 'Test Query',
    description: 'Test Query',
    query: {
      esql: 'FROM logs-* | WHERE level == "error"',
      query_type: 'match',
      severity_score: 50,
      rule_backed: true,
      rule_id: 'rule-1',
      features: [{ id: 'feat-slug-1' }],
    },
    ...overrides,
  };
}

function capturedQueryString(runEsql: jest.Mock): string {
  const query = runEsql.mock.calls[0][1];
  return query.print('basic');
}

beforeEach(() => {
  (executeAndDecodeSource as jest.Mock).mockReset();
});

describe('IndicatorReader space compatibility', () => {
  beforeEach(() => {
    (executeAndDecodeSource as jest.Mock).mockReset();
  });

  it('includes unscoped legacy revisions in normal default-space reads', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValue({ hits: [createQueryDoc()] });

    await expect(reader.getQueryLinks([STREAM], { ruleUnbacked: 'include' })).resolves.toHaveLength(
      1
    );
    const query = capturedQueryString(runEsql);
    expect(query).toContain('kibana.space_ids` == "default"');
    expect(query).toContain('kibana.space_ids` IS NULL');
  });

  it('chooses scoped identity before timestamp and tombstone filtering', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValue({ hits: [] });

    await reader.getQueryLinks([STREAM], { ruleUnbacked: 'include' });
    const query = capturedQueryString(runEsql);
    const priorityIndex = query.indexOf('MAX(__space_priority)');
    const timestampIndex = query.indexOf('MAX(@timestamp)');
    const deletedIndex = query.indexOf('deleted IS NULL');
    expect(query).toContain('EVAL _revision_id = _id');
    expect(query).toContain('KEEP _source, _revision_id');
    expect(query).not.toContain('JSON_SET');
    expect(priorityIndex).toBeGreaterThan(-1);
    expect(timestampIndex).toBeGreaterThan(priorityIndex);
    expect(deletedIndex).toBeGreaterThan(timestampIndex);
  });

  it('scoped tombstones suppress active legacy collisions through scoped precedence', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValue({ hits: [] });

    await reader.getQueryLinks([STREAM], { ruleUnbacked: 'include' });
    const query = capturedQueryString(runEsql);
    expect(query).toContain('__space_priority = CASE');
    expect(query).toContain('__space_priority == __max_space_priority');
    expect(query.indexOf('__space_priority == __max_space_priority')).toBeLessThan(
      query.indexOf('deleted IS NULL')
    );
  });

  it('unscoped tombstones cannot suppress active scoped collisions', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValue({ hits: [createQueryDoc()] });

    await expect(reader.getQueryLinks([STREAM], { ruleUnbacked: 'include' })).resolves.toHaveLength(
      1
    );
    expect(capturedQueryString(runEsql)).toContain('MAX(__space_priority)');
  });

  it('allows the default-space cleanup path to isolate unscoped legacy revisions', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValue({ hits: [createQueryDoc()] });

    await expect(reader.getUnscopedLegacyIndicators([STREAM])).resolves.toEqual({
      features: [],
      queries: [expect.objectContaining({ stream_name: STREAM })],
    });
    expect(capturedQueryString(runEsql)).toContain('kibana.space_ids` IS NULL');
  });

  it('keeps normal non-default reads exact-match only', async () => {
    const { reader, runEsql } = makeReader('other');
    runEsql.mockResolvedValue({ hits: [] });

    await reader.getQueryLinks([STREAM], { ruleUnbacked: 'include' });
    const query = capturedQueryString(runEsql);
    expect(query).toContain('kibana.space_ids` == "other"');
    expect(query).not.toContain('kibana.space_ids` IS NULL');
  });

  it('does not expose cleanup-only unscoped reads to non-default spaces', async () => {
    const { reader, runEsql } = makeReader('other');

    await expect(reader.getUnscopedLegacyIndicators([STREAM])).resolves.toEqual({
      features: [],
      queries: [],
    });
    expect(runEsql).not.toHaveBeenCalled();
  });
});

describe('IndicatorReader.getQueryLinks', () => {
  it('applies IS_NOT_EXPIRED by default', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await reader.getQueryLinks([STREAM]);

    expect(capturedQueryString(runEsql)).toContain(IS_NOT_EXPIRED_FRAGMENT);
  });

  it('omits IS_NOT_EXPIRED when includeExpired is true', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await reader.getQueryLinks([STREAM], { includeExpired: true });

    expect(capturedQueryString(runEsql)).not.toContain(IS_NOT_EXPIRED_FRAGMENT);
  });

  it('returns non-expired rule-backed query', async () => {
    const { reader, runEsql } = makeReader();
    const doc = createQueryDoc({ expires_at: '2099-01-01T00:00:00.000Z' });
    runEsql.mockResolvedValueOnce({ hits: [doc] });

    const links = await reader.getQueryLinks([STREAM]);

    expect(links).toHaveLength(1);
    expect(links[0].query.id).toBe('query-1');
    expect(links[0].expires_at).toBe('2099-01-01T00:00:00.000Z');
  });

  it('returns durable query (no expires_at)', async () => {
    const { reader, runEsql } = makeReader();
    const doc = createQueryDoc();
    runEsql.mockResolvedValueOnce({ hits: [doc] });

    const links = await reader.getQueryLinks([STREAM]);

    expect(links).toHaveLength(1);
    expect(links[0].expires_at).toBeUndefined();
  });

  it('filters query type and rule ID before returning links', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await reader.getQueryLinks([STREAM], {
      queryTypes: ['match'],
      ruleIds: ['rule-1'],
    });

    const query = capturedQueryString(runEsql);
    expect(query).toContain('query.query_type');
    expect(query).toContain('"match"');
    expect(query).toContain('query.rule_id');
    expect(query).toContain('"rule-1"');
  });
});

describe('IndicatorReader.getFeatures', () => {
  it('filters public feature IDs by feature.slug rather than stored UUID', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await reader.getFeatures(STREAM, {
      featureIds: ['payment'],
      type: ['entity'],
    });

    const query = capturedQueryString(runEsql);
    expect(query).toContain('feature.slug');
    expect(query).toContain('"payment"');
    expect(query).toContain('feature.type');
    expect(query).toContain('"entity"');
  });
});

describe('IndicatorReader.getStreamToQueryLinksMap', () => {
  it('omits IS_NOT_EXPIRED when includeExpired is true', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await reader.getStreamToQueryLinksMap([STREAM], { includeExpired: true });

    expect(capturedQueryString(runEsql)).not.toContain(IS_NOT_EXPIRED_FRAGMENT);
  });

  it('includes an expired query when includeExpired is true', async () => {
    const { reader, runEsql } = makeReader();
    const doc = createQueryDoc({ expires_at: '2020-01-01T00:00:00.000Z' });
    runEsql.mockResolvedValueOnce({ hits: [doc] });

    const map = await reader.getStreamToQueryLinksMap([STREAM], { includeExpired: true });

    expect(map[STREAM]).toHaveLength(1);
    expect(map[STREAM][0].query.id).toBe('query-1');
  });
});

describe('IndicatorReader.getPromotableUnbackedQueries', () => {
  it('applies IS_NOT_EXPIRED', async () => {
    const { reader, runEsql } = makeReader();
    runEsql.mockResolvedValueOnce({ hits: [] });

    await reader.getPromotableUnbackedQueries();

    expect(capturedQueryString(runEsql)).toContain(IS_NOT_EXPIRED_FRAGMENT);
  });
});
