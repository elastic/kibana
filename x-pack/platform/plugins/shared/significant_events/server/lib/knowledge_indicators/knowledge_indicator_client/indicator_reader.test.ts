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

function makeReader(): {
  reader: IndicatorReader;
  runEsql: jest.Mock;
} {
  const runEsql = executeAndDecodeSource as jest.Mock;
  const logger = loggerMock.create();
  const revisionReader = new RevisionReader({} as ElasticsearchClient, logger);
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
