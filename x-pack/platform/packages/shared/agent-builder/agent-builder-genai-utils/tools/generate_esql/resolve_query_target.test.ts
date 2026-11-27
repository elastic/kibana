/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsResourceType } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { resolveResourceForEsql } from '../utils/resources';
import { extractQueryTarget, resolveQueryTarget } from './resolve_query_target';

jest.mock('../utils/resources', () => ({
  ...jest.requireActual('../utils/resources'),
  resolveResourceForEsql: jest.fn(),
}));

const resolveResourceMock = resolveResourceForEsql as jest.Mock;

const resolvedAs = (name: string) => ({
  name,
  type: EsResourceType.indexPattern,
  fields: [],
});

describe('extractQueryTarget', () => {
  it('keeps exclusion lists and the source command (EX-1)', () => {
    expect(extractQueryTarget('FROM logs*,-logstash*,filebeat-* | LIMIT 10')).toEqual({
      target: 'logs*,-logstash*,filebeat-*',
      sourceCommand: 'FROM',
    });
    expect(extractQueryTarget('TS metrics-* | STATS max(cpu)')).toEqual({
      target: 'metrics-*',
      sourceCommand: 'TS',
    });
  });

  it('reads the PROMQL index, which defaults to metrics-* (EX-2)', () => {
    expect(
      extractQueryTarget('PROMQL index=metrics-a step=1m start=?_tstart end=?_tend (avg(cpu))')
    ).toEqual({ target: 'metrics-a', sourceCommand: 'PROMQL' });
    expect(extractQueryTarget('PROMQL step=1m start=?_tstart end=?_tend (avg(cpu))')).toEqual({
      target: 'metrics-*',
      sourceCommand: 'PROMQL',
    });
  });

  it('reads the project routing (EX-3)', () => {
    expect(extractQueryTarget('SET project_routing = "_alias:*"; FROM logs-*')).toEqual({
      target: 'logs-*',
      sourceCommand: 'FROM',
      projectRouting: '_alias:*',
    });
  });

  it('keeps prefixes, selectors, views and subquery sources (EX-4)', () => {
    expect(extractQueryTarget('FROM remote:logs-*, local')?.target).toBe('remote:logs-*,local');
    expect(extractQueryTarget('FROM logs-*::failures')?.target).toBe('logs-*::failures');
    expect(extractQueryTarget('FROM $.logs.otel')?.target).toBe('$.logs.otel');
    expect(extractQueryTarget('FROM a, (FROM b | WHERE x > 1)')?.target).toBe('a,b');
  });

  it('works on a query with a syntax error after the source (EX-5)', () => {
    expect(extractQueryTarget('FROM logs-* | WHERE')?.target).toBe('logs-*');
  });

  it('returns nothing for queries without sources (EX-6)', () => {
    expect(extractQueryTarget('ROW a = 1')).toBeUndefined();
    expect(extractQueryTarget('SHOW INFO')).toBeUndefined();
    expect(extractQueryTarget('FROM ')).toBeUndefined();
    expect(extractQueryTarget('// only a comment')).toBeUndefined();
    expect(extractQueryTarget('')).toBeUndefined();
  });
});

describe('resolveQueryTarget', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = { debug: jest.fn() } as unknown as Logger;

  const run = (currentQuery?: string) =>
    resolveQueryTarget({
      currentQuery,
      esClient,
      logger,
      includeDatasets: true,
      includeViews: true,
      includeFrozen: false,
    });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses the current query sources, with its source command and routing', async () => {
    resolveResourceMock.mockResolvedValue(resolvedAs('logs-*'));

    const result = await run('SET project_routing = "_alias:*"; TS logs-* | LIMIT 10');

    expect(result).toEqual({
      strategy: 'current_query',
      resource: resolvedAs('logs-*'),
      sourceCommand: 'TS',
      projectRouting: '_alias:*',
    });
    expect(resolveResourceMock).toHaveBeenCalledWith(
      expect.objectContaining({ resourceName: 'logs-*', includeDatasets: true, includeViews: true })
    );
  });

  it('keeps the target as written, exclusions included', async () => {
    resolveResourceMock.mockResolvedValue(resolvedAs('logs*,-logstash*'));

    await run('FROM logs*,-logstash* | LIMIT 10');

    expect(resolveResourceMock).toHaveBeenCalledWith(
      expect.objectContaining({ resourceName: 'logs*,-logstash*' })
    );
  });

  it.each([undefined, '', 'ROW a = 1'])(
    'returns nothing without current sources (%p)',
    async (currentQuery) => {
      await expect(run(currentQuery)).resolves.toBeUndefined();
      expect(resolveResourceMock).not.toHaveBeenCalled();
    }
  );

  it('returns nothing when the current sources cannot be resolved, so a source is discovered', async () => {
    resolveResourceMock.mockRejectedValue(new Error("No resource found for 'web-log'"));

    await expect(run('FROM web-log | LIMIT 10')).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('"web-log"'));
  });
});
